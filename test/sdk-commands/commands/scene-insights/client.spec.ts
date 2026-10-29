import {
  createInsightsClient,
  createRecentIds,
  createSseParser,
  InsightsClient,
  ServerSentEvent
} from '../../../../packages/@dcl/sdk-commands/src/commands/scene-insights/client'
import { InsightsSession } from '../../../../packages/@dcl/sdk-commands/src/commands/scene-insights/session'
import { LogEntry } from '../../../../packages/@dcl/sdk-commands/src/commands/scene-insights/types'

const BASE_URL = 'https://insights.example.com'
const METADATA = '{"sceneId":"example.dcl.eth"}'

function logEntry(id: string, message: string): LogEntry {
  return {
    id,
    timestamp: '2026-10-12T14:00:00.000Z',
    level: 'info',
    source: 'scene',
    executionId: 'exec-1',
    entityId: 'bafkexample',
    message,
    truncated: false
  }
}

function sse(...frames: string[]): Response {
  return new Response(frames.join(''), { status: 200, headers: { 'content-type': 'text/event-stream' } })
}

function logFrame(entry: LogEntry, id?: string): string {
  return `${id ? `id: ${id}\n` : ''}event: log\ndata: ${JSON.stringify(entry)}\n\n`
}

describe('when parsing a server-sent event stream', () => {
  let events: ServerSentEvent[]
  let parser: ReturnType<typeof createSseParser>

  beforeEach(() => {
    events = []
    parser = createSseParser((event) => events.push(event))
  })

  describe('and an event arrives split across chunks', () => {
    beforeEach(() => {
      parser.push(': connected\n\nid: cur')
      parser.push('sor-1\nevent: log\nda')
      parser.push('ta: {"a":1}\n\n')
    })

    it('should emit it once, whole, skipping the comment', () => {
      expect(events).toEqual([{ event: 'log', data: '{"a":1}', id: 'cursor-1', retry: undefined }])
    })
  })

  describe('and an event has several data lines', () => {
    beforeEach(() => {
      parser.push('data: first\ndata: second\n\n')
    })

    it('should join them with a newline under the default event name', () => {
      expect(events).toEqual([{ event: 'message', data: 'first\nsecond', id: undefined, retry: undefined }])
    })
  })

  describe('and the server announces a retry delay', () => {
    beforeEach(() => {
      parser.push('retry: 2500\n\n')
    })

    it('should emit the delay', () => {
      expect(events).toEqual([{ event: 'message', data: '', id: undefined, retry: 2500 }])
    })
  })

  describe('and the stream uses CRLF line endings', () => {
    beforeEach(() => {
      parser.push('event: log\r\ndata: x\r\n\r\n')
    })

    it('should parse it like LF', () => {
      expect(events).toEqual([{ event: 'log', data: 'x', id: undefined, retry: undefined }])
    })
  })
})

describe('when remembering recent ids', () => {
  let recent: ReturnType<typeof createRecentIds>

  beforeEach(() => {
    recent = createRecentIds(2)
  })

  describe('and an id is added twice', () => {
    it('should accept it only the first time', () => {
      expect([recent.add('a'), recent.add('a')]).toEqual([true, false])
    })
  })

  describe('and more ids than the capacity are added', () => {
    beforeEach(() => {
      recent.add('a')
      recent.add('b')
      recent.add('c')
    })

    it('should forget the oldest one', () => {
      expect(recent.add('a')).toBe(true)
    })
  })
})

describe('when using the insights client', () => {
  let fetchMock: jest.Mock
  let logMock: jest.Mock
  let signMock: jest.Mock
  let client: InsightsClient

  beforeEach(() => {
    fetchMock = jest.fn()
    logMock = jest.fn()
    signMock = jest.fn().mockReturnValue({ 'x-identity-auth-chain-0': 'signed' })
    const session: InsightsSession = { address: '0xexample', expiration: new Date(), sign: signMock }
    client = createInsightsClient(
      {
        fetch: { fetch: fetchMock },
        logger: { log: logMock, info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
      },
      `${BASE_URL}/`,
      session,
      METADATA
    )
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('and it searches logs', () => {
    beforeEach(async () => {
      fetchMock.mockResolvedValueOnce(Response.json({ sceneKey: 'k', logs: [], nextCursor: null, retentionStart: 'x' }))
      await client.searchLogs({ level: 'error', q: 'boom', cursor: undefined })
    })

    it('should send only the defined query parameters', () => {
      expect(fetchMock.mock.calls[0][0]).toBe(`${BASE_URL}/v1/logs?level=error&q=boom`)
    })

    it('should sign the pathname without the query, with the scene metadata', () => {
      expect(signMock).toHaveBeenCalledWith('GET', '/v1/logs', METADATA)
    })

    it('should send the signed headers', () => {
      expect(fetchMock.mock.calls[0][1].headers).toMatchObject({ 'x-identity-auth-chain-0': 'signed' })
    })
  })

  describe('and it lists the metrics', () => {
    beforeEach(async () => {
      fetchMock.mockResolvedValueOnce(Response.json({ sceneKey: 'k', from: 'a', to: 'b', metrics: [] }))
      await client.listMetrics({ from: '1d' })
    })

    it('should request the metrics collection', () => {
      expect(fetchMock.mock.calls[0][0]).toBe(`${BASE_URL}/v1/metrics?from=1d`)
    })
  })

  describe("and it requests a metric's series", () => {
    beforeEach(async () => {
      fetchMock.mockResolvedValueOnce(Response.json({ sceneKey: 'k', metric: 'dcl.scene.cpu.run_ms', points: [] }))
      await client.getMetricSeries('dcl.scene.cpu.run_ms', { step: 60, execution: undefined })
    })

    it('should put the metric in the path and the rest in the query', () => {
      expect(fetchMock.mock.calls[0][0]).toBe(`${BASE_URL}/v1/metrics/dcl.scene.cpu.run_ms/series?step=60`)
    })

    it('should sign the path that names the metric', () => {
      expect(signMock).toHaveBeenCalledWith('GET', '/v1/metrics/dcl.scene.cpu.run_ms/series', METADATA)
    })
  })

  describe('and the service is busy once', () => {
    let busy: Response
    let result: unknown

    beforeEach(async () => {
      busy = new Response('{"error":"busy"}', { status: 429, headers: { 'retry-after': '0.01' } })
      fetchMock
        .mockResolvedValueOnce(busy)
        .mockResolvedValueOnce(Response.json({ sceneKey: 'k', executions: [], retentionStart: 'x' }))
      result = await client.listExecutions({})
    })

    it('should retry with a fresh signature and return the answer', () => {
      expect({ result, calls: fetchMock.mock.calls.length, signatures: signMock.mock.calls.length }).toEqual({
        result: { sceneKey: 'k', executions: [], retentionStart: 'x' },
        calls: 2,
        signatures: 2
      })
    })

    it('should release the busy response body before retrying', () => {
      expect(busy.bodyUsed).toBe(true)
    })
  })

  describe('and the service stays busy past the retries', () => {
    beforeEach(() => {
      fetchMock.mockImplementation(
        async () => new Response('{"error":"busy"}', { status: 503, headers: { 'retry-after': '0.01' } })
      )
    })

    it('should give up after three retries with an unavailable error', async () => {
      await expect(client.listExecutions({})).rejects.toMatchObject({ name: 'SCENE_INSIGHTS_UNAVAILABLE' })
      expect(fetchMock).toHaveBeenCalledTimes(4)
    })
  })

  describe('and a successful answer is not JSON', () => {
    beforeEach(() => {
      fetchMock.mockResolvedValueOnce(new Response('<html>proxy error</html>', { status: 200 }))
    })

    it('should throw a request error quoting the body', async () => {
      await expect(client.listExecutions({})).rejects.toMatchObject({
        name: 'SCENE_INSIGHTS_REQUEST_FAILED',
        message: 'The insights service answered 200 with a body that is not JSON: <html>proxy error</html>'
      })
    })
  })

  describe('and the error reason contains terminal escape sequences', () => {
    beforeEach(() => {
      fetchMock.mockResolvedValueOnce(new Response('{"error":"bad \\u001b]52;c;aGk=\\u0007input"}', { status: 400 }))
    })

    it('should remove the control characters from the message', async () => {
      await expect(client.listExecutions({})).rejects.toMatchObject({
        message: 'The insights service answered 400: bad ]52;c;aGk=input'
      })
    })
  })

  describe('and the signer has no access', () => {
    beforeEach(() => {
      fetchMock.mockResolvedValueOnce(new Response('{"error":"No access to this scene"}', { status: 403 }))
    })

    it('should throw a request error with the reason and what to check', async () => {
      await expect(client.listMetrics({})).rejects.toMatchObject({
        name: 'SCENE_INSIGHTS_FORBIDDEN',
        message: expect.stringMatching(
          /403: No access to this scene \(the signed-in address is not in the scene's logsPermissions/
        )
      })
    })
  })

  describe('and the session is refused', () => {
    beforeEach(() => {
      fetchMock.mockResolvedValueOnce(new Response('{"error":"Invalid signature"}', { status: 401 }))
    })

    it('should throw an unauthorized error telling to sign in again', async () => {
      await expect(client.listExecutions({})).rejects.toMatchObject({
        name: 'SCENE_INSIGHTS_UNAUTHORIZED',
        message: expect.stringContaining('run "sdk-commands scene-insights login"')
      })
    })
  })

  describe('and the service cannot be reached', () => {
    beforeEach(() => {
      fetchMock.mockRejectedValueOnce(Object.assign(new TypeError('fetch failed'), { cause: { code: 'ENOTFOUND' } }))
    })

    it('should throw an unavailable error naming the service and the cause', async () => {
      await expect(client.listExecutions({})).rejects.toMatchObject({
        name: 'SCENE_INSIGHTS_UNAVAILABLE',
        message: `Could not reach ${BASE_URL} (ENOTFOUND)`
      })
    })
  })

  describe('and it follows the tail', () => {
    let received: string[]

    beforeEach(() => {
      received = []
    })

    describe('and the stream ends and the service sends a line again after the reconnect', () => {
      let error: unknown

      beforeEach(async () => {
        fetchMock
          .mockResolvedValueOnce(sse(': connected\n\n', logFrame(logEntry('e1', 'one'), 'c1'), 'retry: 1\n\n'))
          .mockResolvedValueOnce(
            sse(
              logFrame(logEntry('e1', 'one'), 'c1'),
              logFrame(logEntry('e2', 'two'), 'c2'),
              'event: error\ndata: {"error":"access revoked"}\n\n'
            )
          )
        error = await client
          .tail({ lines: 20, onLog: (entry) => received.push(entry.message) })
          .catch((e: unknown) => e)
      })

      it('should deliver every line once, in order', () => {
        expect(received).toEqual(['one', 'two'])
      })

      it('should stop asking for the replay once a live line gave a resume id', () => {
        expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
          `${BASE_URL}/v1/logs/tail?lines=20`,
          `${BASE_URL}/v1/logs/tail`
        ])
      })

      it('should resume from the last event id', () => {
        expect(fetchMock.mock.calls[1][1].headers['Last-Event-ID']).toBe('c1')
      })

      it('should end with the error the service sent', () => {
        expect(error).toMatchObject({
          name: 'SCENE_INSIGHTS_STREAM_ENDED',
          message: 'The insights service ended the tail: access revoked'
        })
      })
    })

    describe('and the stream drops during the replay, before any live line', () => {
      beforeEach(async () => {
        fetchMock
          .mockResolvedValueOnce(sse(logFrame(logEntry('e1', 'one')), 'retry: 1\n\n'))
          .mockResolvedValueOnce(
            sse(
              logFrame(logEntry('e1', 'one')),
              logFrame(logEntry('e2', 'two')),
              logFrame(logEntry('e3', 'three'), 'c3'),
              'event: error\ndata: {"error":"access revoked"}\n\n'
            )
          )
        await client.tail({ lines: 20, onLog: (entry) => received.push(entry.message) }).catch(() => undefined)
      })

      it('should ask for the replay again', () => {
        expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
          `${BASE_URL}/v1/logs/tail?lines=20`,
          `${BASE_URL}/v1/logs/tail?lines=20`
        ])
      })

      it('should not send a resume id it never received', () => {
        expect(fetchMock.mock.calls[1][1].headers['Last-Event-ID']).toBeUndefined()
      })

      it('should show the replayed history once, then the live line', () => {
        expect(received).toEqual(['one', 'two', 'three'])
      })
    })

    describe('and several lines arrive without an event id', () => {
      beforeEach(async () => {
        fetchMock.mockResolvedValueOnce(
          sse(
            logFrame(logEntry('', 'first without id'), 'c1'),
            logFrame(logEntry('', 'second without id'), 'c2'),
            'event: error\ndata: {"error":"access revoked"}\n\n'
          )
        )
        await client.tail({ onLog: (entry) => received.push(entry.message) }).catch(() => undefined)
      })

      it('should show every one of them instead of treating them as repeats', () => {
        expect(received).toEqual(['first without id', 'second without id'])
      })
    })

    describe('and the signal is aborted', () => {
      let controller: AbortController

      beforeEach(async () => {
        controller = new AbortController()
        fetchMock.mockImplementationOnce(async () => {
          controller.abort()
          return sse(logFrame(logEntry('e1', 'one'), 'c1'))
        })
        await client.tail({ signal: controller.signal, onLog: (entry) => received.push(entry.message) })
      })

      it('should stop without reconnecting', () => {
        expect(fetchMock).toHaveBeenCalledTimes(1)
      })
    })

    describe('and the service is busy before the stream', () => {
      let busy: Response

      beforeEach(async () => {
        busy = new Response('{"error":"busy"}', { status: 503, headers: { 'retry-after': '0.01' } })
        fetchMock
          .mockResolvedValueOnce(busy)
          .mockResolvedValueOnce(sse(logFrame(logEntry('e1', 'one'), 'c1'), 'event: error\ndata: {"error":"done"}\n\n'))
        await client.tail({ onLog: (entry) => received.push(entry.message) }).catch(() => undefined)
      })

      it('should release the busy response body', () => {
        expect(busy.bodyUsed).toBe(true)
      })

      it('should reconnect and deliver the line', () => {
        expect(received).toEqual(['one'])
      })
    })

    describe('and the server announces the reconnect delay', () => {
      let setTimeoutSpy: jest.SpyInstance

      beforeEach(async () => {
        setTimeoutSpy = jest.spyOn(global, 'setTimeout')
        fetchMock
          .mockResolvedValueOnce(sse('retry: 7\n\n'))
          .mockResolvedValueOnce(sse('event: error\ndata: {"error":"done"}\n\n'))
        await client.tail({ onLog: (entry) => received.push(entry.message) }).catch(() => undefined)
      })

      afterEach(() => {
        setTimeoutSpy.mockRestore()
      })

      it('should wait that long instead of its own backoff', () => {
        expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 7)
      })
    })

    describe('and a log event is malformed', () => {
      let error: unknown

      beforeEach(async () => {
        fetchMock.mockResolvedValueOnce(
          sse(
            'id: c1\nevent: log\ndata: {not json\n\n',
            'id: c2\nevent: log\ndata: {"message":42}\n\n',
            logFrame(logEntry('e3', 'three'), 'c3'),
            'event: error\ndata: {"error":"done"}\n\n'
          )
        )
        error = await client.tail({ onLog: (entry) => received.push(entry.message) }).catch((e: unknown) => e)
      })

      it('should skip it and keep delivering the stream', () => {
        expect(received).toEqual(['three'])
      })

      it('should not treat it as a dropped connection', () => {
        expect({ calls: fetchMock.mock.calls.length, error }).toMatchObject({
          calls: 1,
          error: { name: 'SCENE_INSIGHTS_STREAM_ENDED' }
        })
      })

      it('should note each skipped line', () => {
        expect(logMock.mock.calls.map((call) => call[0])).toEqual([
          'Skipped a malformed log line from the insights service (event c1)',
          'Skipped a malformed log line from the insights service (event c2)'
        ])
      })
    })

    describe('and the service refuses the stream', () => {
      beforeEach(() => {
        fetchMock.mockResolvedValueOnce(new Response('{"error":"Unknown world"}', { status: 404 }))
      })

      it('should throw instead of reconnecting', async () => {
        await expect(client.tail({ onLog: (entry) => received.push(entry.message) })).rejects.toMatchObject({
          name: 'SCENE_INSIGHTS_NOT_FOUND',
          message: expect.stringContaining('404: Unknown world')
        })
      })
    })
  })
})
