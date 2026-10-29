import { InsightsClient } from './client'
import { formatExecutions, formatLogEntry, formatMetricNames, formatMetricSeries } from './format'
import { LOG_LEVELS, LogLevel } from './inputs'
import { ExecutionsResult, LogEntry, MetricNamesResult, MetricSeries } from './types'

/**
 * Where results go: text to `write` (stdout), notes about it to `note` (stderr). With `json`, a
 * subcommand prints no text and returns its result instead, which the CLI prints as JSON (the
 * `--json` convention of every sdk-commands command); only the tail, a stream, writes its own
 * JSON, one entry per line.
 */
export interface Output {
  write(line: string): void
  note(message: string): void
  json: boolean
  color: boolean
}

export interface LogsResult {
  sceneKey: string
  /** Oldest first */
  logs: LogEntry[]
  /** Whether more lines matched than were returned */
  more: boolean
}

/** The service's page size cap. */
const MAX_PAGE = 1000

export interface LogsParams {
  from?: string
  to?: string
  level?: LogLevel
  source?: string
  query?: string
  execution?: string
  /** Lines to print in total, across pages */
  limit: number
  /** `desc` prints the newest `limit` lines, `asc` the oldest */
  order: 'asc' | 'desc'
}

/**
 * Searches the persisted logs, paging until `limit` lines, and prints them oldest first.
 */
export async function runLogs(client: InsightsClient, params: LogsParams, output: Output): Promise<LogsResult> {
  const entries: LogEntry[] = []
  let cursor: string | undefined
  let more = false
  let sceneKey = ''

  do {
    const page = await client.searchLogs({
      from: params.from,
      to: params.to,
      level: params.level,
      source: params.source,
      q: params.query,
      execution: params.execution,
      order: params.order,
      limit: Math.min(MAX_PAGE, params.limit - entries.length),
      cursor
    })
    sceneKey = page.sceneKey
    entries.push(...page.logs)
    // an empty page with a cursor would otherwise be requested forever
    cursor = page.logs.length > 0 ? (page.nextCursor ?? undefined) : undefined
    more = !!cursor
  } while (cursor && entries.length < params.limit)

  const result = { sceneKey, logs: params.order === 'desc' ? entries.reverse() : entries, more }
  if (output.json) return result

  for (const entry of result.logs) {
    output.write(formatLogEntry(entry, output.color))
  }
  if (entries.length === 0) {
    output.note('No log lines match')
  } else if (more) {
    output.note(
      `Printed ${entries.length} lines; more match. Raise --limit or narrow --from/--to, --level or --query to see them.`
    )
  }
  return result
}

export interface TailParams {
  /** Replay the newest N lines before following */
  lines?: number
  /** Only print lines at this level or above */
  level?: LogLevel
  /** Only print lines containing this text (case-insensitive) */
  query?: string
  signal?: AbortSignal
}

/** Whether an entry passes the tail's local filters (the tail endpoint has none of its own). */
export function matchesTailFilters(entry: LogEntry, params: Pick<TailParams, 'level' | 'query'>): boolean {
  if (params.level && LOG_LEVELS.indexOf(entry.level) < LOG_LEVELS.indexOf(params.level)) {
    return false
  }
  if (params.query && !entry.message.toLowerCase().includes(params.query.toLowerCase())) {
    return false
  }
  return true
}

/** Follows the live tail until interrupted or `signal` aborts. */
export async function runTail(client: InsightsClient, params: TailParams, output: Output): Promise<void> {
  output.note('Following the scene logs')
  await client.tail({
    lines: params.lines,
    signal: params.signal,
    onLog(entry) {
      if (matchesTailFilters(entry, params)) {
        output.write(output.json ? JSON.stringify(entry) : formatLogEntry(entry, output.color))
      }
    }
  })
}

export interface MetricsParams {
  /** A full metric name; without it the metrics with data are listed */
  metric?: string
  from?: string
  to?: string
  step?: number
  execution?: string
}

/** Lists the scene's metrics, or prints one metric's series. */
export async function runMetrics(
  client: InsightsClient,
  params: MetricsParams,
  output: Output
): Promise<MetricNamesResult | MetricSeries> {
  if (!params.metric) {
    const names = await client.listMetrics({ from: params.from, to: params.to })
    if (output.json) return names
    formatMetricNames(names).forEach((line) => output.write(line))
    if (names.metrics.length > 0) {
      output.note('Chart one with: scene-insights metrics <name>')
    }
    return names
  }

  const series = await client.getMetricSeries(params.metric, {
    from: params.from,
    to: params.to,
    step: params.step,
    execution: params.execution
  })
  if (output.json) return series
  formatMetricSeries(series).forEach((line) => output.write(line))
  return series
}

/** Lists the scene's executions (deployments × process restarts). */
export async function runExecutions(
  client: InsightsClient,
  params: Pick<MetricsParams, 'from' | 'to'>,
  output: Output
): Promise<ExecutionsResult> {
  const result = await client.listExecutions({ from: params.from, to: params.to })
  if (output.json) return result
  formatExecutions(result).forEach((line) => output.write(line))
  return result
}
