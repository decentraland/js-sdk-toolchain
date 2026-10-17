import {
  matchesTailFilters,
  Output,
  runExecutions,
  runLogs,
  runMetrics
} from '../../../../packages/@dcl/sdk-commands/src/commands/scene-insights/actions'
import { InsightsClient } from '../../../../packages/@dcl/sdk-commands/src/commands/scene-insights/client'
import {
  formatLogEntry,
  formatValue,
  sparkline
} from '../../../../packages/@dcl/sdk-commands/src/commands/scene-insights/format'
import { LogEntry, MetricSeries } from '../../../../packages/@dcl/sdk-commands/src/commands/scene-insights/types'

function logEntry(id: string, message: string, overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    id,
    timestamp: '2026-10-12T14:00:00.000Z',
    level: 'info',
    source: 'scene',
    executionId: 'exec-1',
    entityId: 'bafkexample',
    message,
    truncated: false,
    ...overrides
  }
}

function page(logs: LogEntry[], nextCursor: string | null) {
  return { sceneKey: 'world:example.dcl.eth:0,0', logs, nextCursor, retentionStart: '2026-10-05T14:00:00.000Z' }
}

describe('when running the logs subcommand', () => {
  let searchLogs: jest.Mock
  let client: InsightsClient
  let written: string[]
  let notes: string[]
  let output: Output

  beforeEach(() => {
    searchLogs = jest.fn()
    client = { searchLogs } as unknown as InsightsClient
    written = []
    notes = []
    output = { write: (line) => written.push(line), note: (message) => notes.push(message), json: false, color: false }
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('and the newest lines span two pages', () => {
    beforeEach(async () => {
      searchLogs
        .mockResolvedValueOnce(page([logEntry('4', 'four'), logEntry('3', 'three')], 'cursor-2'))
        .mockResolvedValueOnce(page([logEntry('2', 'two')], null))
      await runLogs(client, { limit: 3, order: 'desc', level: 'warn' }, output)
    })

    it('should print them oldest first', () => {
      expect(written.map((line) => line.split(' INFO  ')[1])).toEqual(['two', 'three', 'four'])
    })

    it('should request the second page with the cursor, the same filters and only the remaining lines', () => {
      expect(searchLogs.mock.calls[1][0]).toMatchObject({ cursor: 'cursor-2', level: 'warn', order: 'desc', limit: 1 })
    })
  })

  describe('and more lines match than the limit', () => {
    beforeEach(async () => {
      searchLogs.mockResolvedValueOnce(page([logEntry('2', 'two'), logEntry('1', 'one')], 'cursor-2'))
      await runLogs(client, { limit: 2, order: 'desc' }, output)
    })

    it('should stop paging', () => {
      expect(searchLogs).toHaveBeenCalledTimes(1)
    })

    it('should say that more lines match', () => {
      expect(notes).toEqual([expect.stringContaining('Printed 2 lines; more match')])
    })
  })

  describe('and the oldest lines are asked for', () => {
    beforeEach(async () => {
      searchLogs.mockResolvedValueOnce(page([logEntry('1', 'one'), logEntry('2', 'two')], null))
      await runLogs(client, { limit: 100, order: 'asc' }, output)
    })

    it('should print them in the order they came', () => {
      expect(written.map((line) => line.split(' INFO  ')[1])).toEqual(['one', 'two'])
    })
  })

  describe('and the output is JSON', () => {
    let result: Awaited<ReturnType<typeof runLogs>>

    beforeEach(async () => {
      output.json = true
      searchLogs.mockResolvedValueOnce(page([logEntry('2', 'two'), logEntry('1', 'one')], 'cursor-2'))
      result = await runLogs(client, { limit: 2, order: 'desc' }, output)
    })

    it('should return the lines oldest first, and whether more match, for the CLI to print', () => {
      expect({
        messages: result.logs.map((entry) => entry.message),
        more: result.more,
        sceneKey: result.sceneKey
      }).toEqual({ messages: ['one', 'two'], more: true, sceneKey: 'world:example.dcl.eth:0,0' })
    })

    it('should print no text', () => {
      expect({ written, notes }).toEqual({ written: [], notes: [] })
    })
  })

  describe('and nothing matches', () => {
    beforeEach(async () => {
      searchLogs.mockResolvedValueOnce(page([], null))
      await runLogs(client, { limit: 100, order: 'desc' }, output)
    })

    it('should say so', () => {
      expect(notes).toEqual(['No log lines match'])
    })
  })
})

describe('when filtering tailed lines', () => {
  describe('and the line is below the minimum level', () => {
    it('should drop it', () => {
      expect(matchesTailFilters(logEntry('1', 'x', { level: 'info' }), { level: 'warn' })).toBe(false)
    })
  })

  describe('and the line is at the minimum level', () => {
    it('should keep it', () => {
      expect(matchesTailFilters(logEntry('1', 'x', { level: 'warn' }), { level: 'warn' })).toBe(true)
    })
  })

  describe('and the line contains the query in another case', () => {
    it('should keep it', () => {
      expect(matchesTailFilters(logEntry('1', 'Player Joined'), { query: 'player joined' })).toBe(true)
    })
  })

  describe('and the line does not contain the query', () => {
    it('should drop it', () => {
      expect(matchesTailFilters(logEntry('1', 'heartbeat'), { query: 'error' })).toBe(false)
    })
  })
})

describe('when running the metrics subcommand', () => {
  let client: InsightsClient
  let written: string[]
  let output: Output

  beforeEach(() => {
    written = []
    output = { write: (line) => written.push(line), note: jest.fn(), json: false, color: false }
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('and no metric is named', () => {
    beforeEach(async () => {
      client = {
        listMetrics: jest.fn().mockResolvedValueOnce({
          sceneKey: 'k',
          from: 'a',
          to: 'b',
          metrics: [{ name: 'dcl.scene.mem.heap_used', type: 'gauge', unit: 'bytes' }]
        })
      } as unknown as InsightsClient
      await runMetrics(client, {}, output)
    })

    it('should print a table of the metrics with data', () => {
      expect(written).toEqual(['METRIC                   TYPE   UNIT', 'dcl.scene.mem.heap_used  gauge  bytes'])
    })
  })

  describe('and a sum metric is named', () => {
    let getMetricSeries: jest.Mock
    let series: MetricSeries

    beforeEach(async () => {
      series = {
        sceneKey: 'k',
        metric: 'dcl.scene.logs.lines',
        type: 'sum',
        unit: 'count',
        rateUnit: 'count/s',
        stepSeconds: 10,
        from: '2026-10-12T14:00:00.000Z',
        to: '2026-10-12T14:00:30.000Z',
        points: [
          { t: '2026-10-12T14:00:00.000Z', sum: 2, rate: 0.2 },
          { t: '2026-10-12T14:00:10.000Z', sum: null, rate: null },
          { t: '2026-10-12T14:00:20.000Z', sum: 802, rate: 80.2 }
        ]
      }
      getMetricSeries = jest.fn().mockResolvedValueOnce(series)
      client = { getMetricSeries } as unknown as InsightsClient
      await runMetrics(client, { metric: 'dcl.scene.logs.lines', step: 10 }, output)
    })

    it('should request the metric with the step', () => {
      expect(getMetricSeries).toHaveBeenCalledWith('dcl.scene.logs.lines', expect.objectContaining({ step: 10 }))
    })

    it('should print a sparkline with a gap and one row per bucket', () => {
      expect(written.slice(1)).toEqual([
        'sum ▁ █',
        '',
        'TIME                      SUM  RATE',
        '2026-10-12 14:00:00.000Z  2    0.20/s',
        '2026-10-12 14:00:10.000Z  -    -',
        '2026-10-12 14:00:20.000Z  802  80.2/s'
      ])
    })
  })
})

describe('when running the executions subcommand with --json', () => {
  let client: InsightsClient
  let written: string[]
  let response: object
  let result: unknown

  beforeEach(async () => {
    written = []
    response = { sceneKey: 'k', executions: [], retentionStart: 'x' }
    client = { listExecutions: jest.fn().mockResolvedValueOnce(response) } as unknown as InsightsClient
    result = await runExecutions(
      client,
      {},
      { write: (line) => written.push(line), note: jest.fn(), json: true, color: false }
    )
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('should return the response for the CLI to print as JSON, printing no text', () => {
    expect({ result, written }).toEqual({ result: response, written: [] })
  })
})

describe('when formatting a log entry without color', () => {
  describe('and it comes from the engine and has several lines', () => {
    it('should name the source and indent the following lines under the message', () => {
      expect(formatLogEntry(logEntry('1', 'first\nsecond', { level: 'warn', source: 'engine' }), false)).toBe(
        '2026-10-12 14:00:00.000Z WARN  [engine] first\n                               second'
      )
    })
  })

  describe('and it was truncated', () => {
    it('should mark it', () => {
      expect(formatLogEntry(logEntry('1', 'long', { truncated: true }), false)).toBe(
        '2026-10-12 14:00:00.000Z INFO  long … (truncated)'
      )
    })
  })
})

describe('when formatting a value', () => {
  describe('and it is in bytes', () => {
    it('should use binary multiples', () => {
      expect(formatValue(6_099_328, 'bytes')).toBe('5.82 MiB')
    })
  })

  describe('and it is a rate of milliseconds', () => {
    it('should switch to seconds past a thousand', () => {
      expect(formatValue(1500, 'ms/s')).toBe('1.50 s/s')
    })
  })

  describe('and it is missing', () => {
    it('should print a dash', () => {
      expect(formatValue(null, 'count')).toBe('-')
    })
  })
})

describe('when drawing a sparkline of equal values', () => {
  it('should draw the lowest bar for each', () => {
    expect(sparkline([3, 3, 3])).toBe('▁▁▁')
  })
})
