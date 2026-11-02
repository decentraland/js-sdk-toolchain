import { CliComponents } from '../../components'
import { CliError, CliErrorName } from '../../logic/error'
import { stripControlCharacters } from './format'
import { InsightsSession } from './session'
import { ExecutionsResult, LogEntry, LogSearchResult, MetricNamesResult, MetricSeries } from './types'

/** Query parameters; undefined values are left out. */
export type Query = Record<string, string | number | undefined>

/** Retries of a request the service refused for capacity (429/503 with Retry-After). */
const MAX_BUSY_RETRIES = 3
const MAX_RETRY_AFTER_MS = 10_000
/** Reconnect delays of a tail whose connection failed, doubled up to the maximum. */
const TAIL_RECONNECT_MIN_MS = 1_000
const TAIL_RECONNECT_MAX_MS = 30_000
/** Event ids remembered to drop the lines the service sends twice around a reconnect. */
const TAIL_SEEN_IDS = 10_000

export interface InsightsClient {
  searchLogs(query: Query): Promise<LogSearchResult>
  listExecutions(query: Query): Promise<ExecutionsResult>
  /** The metrics with data for the scene (`GET /v1/metrics`). */
  listMetrics(query: Query): Promise<MetricNamesResult>
  /** One metric's series (`GET /v1/metrics/<metric>/series`); the metric name is part of the signed path. */
  getMetricSeries(metric: string, query: Query): Promise<MetricSeries>
  /**
   * Follows the live tail until `signal` aborts or the service ends the stream with an error.
   * Reconnects on its own after a dropped connection or a server restart, resuming from the last
   * event, and never delivers the same line twice.
   */
  tail(options: { lines?: number; signal?: AbortSignal; onLog: (entry: LogEntry) => void }): Promise<void>
}

export interface ServerSentEvent {
  event: string
  data: string
  id?: string
  retry?: number
}

/**
 * Incremental `text/event-stream` parser: feed it decoded chunks, and it calls `onEvent` for every
 * complete event. Comments (`: ping`) are skipped.
 */
export function createSseParser(onEvent: (event: ServerSentEvent) => void) {
  let buffer = ''
  let event = ''
  let data: string[] = []
  let id: string | undefined
  let retry: number | undefined

  function dispatch() {
    if (data.length > 0 || retry !== undefined) {
      onEvent({ event: event || 'message', data: data.join('\n'), id, retry })
    }
    event = ''
    data = []
    id = undefined
    retry = undefined
  }

  return {
    push(chunk: string) {
      buffer += chunk
      const lines = buffer.split(/\r\n|\r|\n/)
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (line === '') {
          dispatch()
          continue
        }
        if (line.startsWith(':')) continue
        const separator = line.indexOf(':')
        const field = separator === -1 ? line : line.slice(0, separator)
        let value = separator === -1 ? '' : line.slice(separator + 1)
        if (value.startsWith(' ')) value = value.slice(1)
        if (field === 'event') event = value
        else if (field === 'data') data.push(value)
        else if (field === 'id') id = value
        else if (field === 'retry' && /^\d+$/.test(value)) retry = parseInt(value, 10)
      }
    }
  }
}

/** Remembers the most recent ids, forgetting the oldest past its capacity. */
export function createRecentIds(capacity: number) {
  const ids = new Set<string>()
  return {
    /** Records the id; false when it was already seen. */
    add(id: string): boolean {
      if (ids.has(id)) return false
      ids.add(id)
      if (ids.size > capacity) {
        ids.delete(ids.values().next().value as string)
      }
      return true
    }
  }
}

/** The Retry-After delay of a response, bounded, in milliseconds. */
export function retryAfterMs(response: Response): number {
  const seconds = Number(response.headers.get('retry-after'))
  return Math.min(Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 1000, MAX_RETRY_AFTER_MS)
}

/** The error name of each status a caller can act on; anything else is a plain request failure. */
const ERRORS_BY_STATUS: Record<number, { name: CliErrorName; hint?: string }> = {
  400: { name: 'SCENE_INSIGHTS_INVALID_ARGUMENT' },
  401: {
    name: 'SCENE_INSIGHTS_UNAUTHORIZED',
    hint: 'the session was refused; run "sdk-commands scene-insights login" to sign a new one'
  },
  403: {
    name: 'SCENE_INSIGHTS_FORBIDDEN',
    hint: "the signed-in address is not in the scene's logsPermissions, and is not the World's owner or a deployer"
  },
  404: { name: 'SCENE_INSIGHTS_NOT_FOUND', hint: 'no deployed scene matches the World or parcel' },
  429: { name: 'SCENE_INSIGHTS_UNAVAILABLE', hint: 'too many requests; try again shortly' },
  503: { name: 'SCENE_INSIGHTS_UNAVAILABLE', hint: 'try again shortly' },
  504: { name: 'SCENE_INSIGHTS_UNAVAILABLE', hint: 'the query timed out; narrow --from/--to or the filters' }
}

/** Turns an error response into a CliError named after what went wrong, saying what to do about it. */
export async function errorFromResponse(response: Response): Promise<CliError<CliErrorName>> {
  let reason = ''
  try {
    const text = await response.text()
    try {
      reason = String(JSON.parse(text).error ?? text)
    } catch {
      reason = text
    }
  } catch {
    // keep the status alone
  }
  reason = stripControlCharacters(reason)

  const { name, hint } = ERRORS_BY_STATUS[response.status] ?? { name: 'SCENE_INSIGHTS_REQUEST_FAILED' }
  const message = `The insights service answered ${response.status}${reason ? `: ${reason}` : ''}${hint ? ` (${hint})` : ''}`
  return new CliError(name, message)
}

/** A request that never got an answer (DNS, connection refused, reset). */
function unreachable(baseUrl: string, error: unknown): CliError<'SCENE_INSIGHTS_UNAVAILABLE'> {
  const cause = (error as { cause?: { code?: string } })?.cause?.code ?? (error as Error)?.message
  return new CliError('SCENE_INSIGHTS_UNAVAILABLE', `Could not reach ${baseUrl}${cause ? ` (${cause})` : ''}`)
}

/** Whether a parsed `log` event has the fields the tail prints and filters on. */
function isLogEntry(value: unknown): value is LogEntry {
  const entry = value as Partial<LogEntry> | null
  return (
    typeof entry === 'object' &&
    entry !== null &&
    typeof entry.message === 'string' &&
    typeof entry.level === 'string' &&
    typeof entry.source === 'string' &&
    typeof entry.timestamp === 'string'
  )
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(done, ms)
    function done() {
      clearTimeout(timer)
      signal?.removeEventListener('abort', done)
      resolve()
    }
    signal?.addEventListener('abort', done, { once: true })
  })

/**
 * Client of multiplayer-scenes-insights-service. Every request is signed with the session for the
 * target scene (the service reads the scene from the signed metadata, never from the query).
 */
export function createInsightsClient(
  components: Pick<CliComponents, 'fetch' | 'logger'>,
  baseUrl: string,
  session: InsightsSession,
  metadata: string
): InsightsClient {
  const { fetch, logger } = components
  const base = baseUrl.replace(/\/+$/, '')

  function urlFor(pathname: string, query: Query = {}): string {
    const url = new URL(base + pathname)
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value))
    }
    return url.toString()
  }

  async function get<T>(pathname: string, query: Query): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      let response: Response
      try {
        response = await fetch.fetch(urlFor(pathname, query), {
          headers: { ...session.sign('GET', pathname, metadata), Accept: 'application/json' }
        })
      } catch (error) {
        throw unreachable(base, error)
      }
      if (response.ok) {
        return readJson<T>(response)
      }
      if ((response.status === 429 || response.status === 503) && attempt < MAX_BUSY_RETRIES) {
        const delay = retryAfterMs(response)
        // an unread body keeps its socket until it is garbage collected
        await response.body?.cancel()
        logger.log(`The insights service is busy (${response.status}); retrying in ${Math.ceil(delay / 1000)}s`)
        await sleep(delay)
        continue
      }
      throw await errorFromResponse(response)
    }
  }

  async function readJson<T>(response: Response): Promise<T> {
    let text: string
    try {
      text = await response.text()
    } catch (error) {
      throw unreachable(base, error)
    }
    try {
      return JSON.parse(text) as T
    } catch {
      throw new CliError(
        'SCENE_INSIGHTS_REQUEST_FAILED',
        `The insights service answered ${response.status} with a body that is not JSON: ${stripControlCharacters(text.slice(0, 200))}`
      )
    }
  }

  async function tail({ lines, signal, onLog }: Parameters<InsightsClient['tail']>[0]): Promise<void> {
    const pathname = '/v1/logs/tail'
    const seen = createRecentIds(TAIL_SEEN_IDS)
    let lastEventId: string | undefined
    let reconnectMs = TAIL_RECONNECT_MIN_MS

    while (!signal?.aborted) {
      let serverRetryMs: number | undefined
      let streamError: string | undefined

      try {
        // Replayed lines carry no resume id: until a live line gives one, a
        // reconnect asks for the history again and `seen` drops what was shown.
        const response = await fetch.fetch(urlFor(pathname, !lastEventId && lines ? { lines } : {}), {
          headers: {
            ...session.sign('GET', pathname, metadata),
            Accept: 'text/event-stream',
            ...(lastEventId && { 'Last-Event-ID': lastEventId })
          },
          signal
        })

        if (!response.ok) {
          if (response.status !== 429 && response.status !== 503) {
            throw await errorFromResponse(response)
          }
          serverRetryMs = retryAfterMs(response)
          await response.body?.cancel()
          logger.log(`The insights service is busy (${response.status}); reconnecting`)
        } else if (response.body) {
          reconnectMs = TAIL_RECONNECT_MIN_MS
          const decoder = new TextDecoder()
          const parser = createSseParser((event) => {
            if (event.retry !== undefined) serverRetryMs = event.retry
            if (event.event === 'error') {
              try {
                streamError = String(JSON.parse(event.data).error)
              } catch {
                streamError = event.data
              }
              streamError = stripControlCharacters(streamError)
            } else if (event.event === 'log') {
              if (event.id) lastEventId = event.id
              // skipped rather than thrown: a throw here reads as a dropped connection and resumes at the same line
              let entry: unknown
              try {
                entry = JSON.parse(event.data)
              } catch {
                entry = undefined
              }
              if (!isLogEntry(entry)) {
                logger.log(
                  `Skipped a malformed log line from the insights service${event.id ? ` (event ${event.id})` : ''}`
                )
                return
              }
              // an empty id means the line has none: never treat it as a repeat
              if (!entry.id || seen.add(entry.id)) onLog(entry)
            }
          })
          for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
            parser.push(decoder.decode(chunk, { stream: true }))
          }
        }
      } catch (e) {
        if (signal?.aborted) return
        if (e instanceof CliError) throw e
        logger.log(`The tail connection dropped (${(e as Error).message}); reconnecting`)
      }

      if (streamError !== undefined) {
        throw new CliError('SCENE_INSIGHTS_STREAM_ENDED', `The insights service ended the tail: ${streamError}`)
      }
      if (signal?.aborted) return

      const delay = serverRetryMs ?? reconnectMs
      reconnectMs = Math.min(reconnectMs * 2, TAIL_RECONNECT_MAX_MS)
      await sleep(delay, signal)
    }
  }

  return {
    searchLogs: (query) => get<LogSearchResult>('/v1/logs', query),
    listExecutions: (query) => get<ExecutionsResult>('/v1/executions', query),
    listMetrics: (query) => get<MetricNamesResult>('/v1/metrics', query),
    getMetricSeries: (metric, query) => get<MetricSeries>(`/v1/metrics/${encodeURIComponent(metric)}/series`, query),
    tail
  }
}
