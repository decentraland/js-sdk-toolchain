import { colors } from '../../components/log'
import { ExecutionsResult, GaugePoint, LogEntry, MetricNamesResult, MetricSeries, SumPoint } from './types'

const SPARK = '▁▂▃▄▅▆▇█'
const identity = (text: string | number) => String(text)

/** C0 and C1 control characters except tab and newline: escape sequences a terminal would act on. */
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g

/** Removes what a terminal would interpret (cursor moves, OSC 8 links, OSC 52 clipboard writes) from service text. */
export function stripControlCharacters(text: string): string {
  return text.replace(CONTROL_CHARACTERS, '')
}

/** `2026-10-12T14:13:02.166Z` → `2026-10-12 14:13:02.166Z`; anything unparseable is returned as is. */
export function formatTimestamp(iso: string): string {
  const time = Date.parse(iso)
  return Number.isNaN(time) ? iso : new Date(time).toISOString().replace('T', ' ')
}

/**
 * One log entry as terminal text: time, level, the source when it is not the scene itself, and the
 * message, with the lines of a multi-line message indented under the first.
 */
export function formatLogEntry(entry: LogEntry, color: boolean): string {
  const paint =
    {
      error: color ? colors.redBright : identity,
      warn: color ? colors.yellow : identity,
      info: identity,
      debug: color ? colors.dim : identity
    }[entry.level] ?? identity
  const dim = color ? colors.dim : identity

  const time = stripControlCharacters(formatTimestamp(entry.timestamp))
  const level = stripControlCharacters(entry.level.toUpperCase()).padEnd(5)
  const source = entry.source === 'scene' ? '' : `[${stripControlCharacters(entry.source)}] `
  const prefix = `${time} ${level} `
  const message = stripControlCharacters(entry.message)
    .split('\n')
    .join('\n' + ' '.repeat(prefix.length))
  const truncated = entry.truncated ? dim(' … (truncated)') : ''

  return `${dim(time)} ${paint(level)} ${dim(source)}${paint(message)}${truncated}`
}

/** A value in its unit: bytes in binary multiples, milliseconds up to seconds, counts as numbers. */
export function formatValue(value: number | null, unit: string): string {
  if (value === null || !Number.isFinite(value)) return '-'
  const round = (n: number) => (Math.abs(n) >= 100 ? n.toFixed(0) : Math.abs(n) >= 10 ? n.toFixed(1) : n.toFixed(2))

  const base = unit.split('/')[0]
  const per = unit.includes('/') ? `/${unit.split('/')[1]}` : ''
  if (base === 'bytes') {
    const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB']
    let scaled = value
    let index = 0
    while (Math.abs(scaled) >= 1024 && index < units.length - 1) {
      scaled /= 1024
      index++
    }
    return `${index === 0 ? Math.round(scaled) : round(scaled)} ${units[index]}${per}`
  }
  if (base === 'ms') {
    return Math.abs(value) >= 1000 ? `${round(value / 1000)} s${per}` : `${round(value)} ms${per}`
  }
  return `${Number.isInteger(value) ? value : round(value)}${per}`
}

/** A one-line chart of the values; gaps are blanks. */
export function sparkline(values: Array<number | null>): string {
  const present = values.filter((v): v is number => v !== null && Number.isFinite(v))
  if (present.length === 0) return ''
  const min = Math.min(...present)
  const max = Math.max(...present)
  return values
    .map((v) => {
      if (v === null || !Number.isFinite(v)) return ' '
      if (max === min) return SPARK[0]
      return SPARK[Math.round(((v - min) / (max - min)) * (SPARK.length - 1))]
    })
    .join('')
}

/** Left-aligned columns separated by two spaces. */
export function formatTable(header: string[], rawRows: string[][]): string[] {
  const rows = rawRows.map((row) => row.map(stripControlCharacters))
  const widths = header.map((title, column) => Math.max(title.length, ...rows.map((row) => row[column].length)))
  const line = (cells: string[]) =>
    cells
      .map((cell, column) => (column === cells.length - 1 ? cell : cell.padEnd(widths[column])))
      .join('  ')
      .trimEnd()
  return [line(header), ...rows.map(line)]
}

export function formatMetricNames(result: MetricNamesResult): string[] {
  if (result.metrics.length === 0) {
    return [stripControlCharacters(`No metrics for ${result.sceneKey} between ${result.from} and ${result.to}`)]
  }
  return formatTable(
    ['METRIC', 'TYPE', 'UNIT'],
    result.metrics.map((metric) => [metric.name, metric.type, metric.unit])
  )
}

/**
 * A metric series: a header, a sparkline, and one row per bucket. Gauges show the average and the
 * maximum; sums show the bucket total and its rate per second.
 */
export function formatMetricSeries(series: MetricSeries): string[] {
  const head = stripControlCharacters(
    `${series.metric} (${series.type ?? 'no data'}, ${series.unit}) every ${series.stepSeconds}s, ${formatTimestamp(series.from)} → ${formatTimestamp(series.to)}`
  )
  if (series.type === null || series.points.length === 0) {
    return [head, 'No data in this range']
  }

  if (series.type === 'gauge') {
    const points = series.points as GaugePoint[]
    return [
      head,
      `avg ${sparkline(points.map((p) => p.avg))}`,
      '',
      ...formatTable(
        ['TIME', 'AVG', 'MAX'],
        points.map((p) => [formatTimestamp(p.t), formatValue(p.avg, series.unit), formatValue(p.max, series.unit)])
      )
    ]
  }

  const points = series.points as SumPoint[]
  const rateUnit = series.rateUnit ?? `${series.unit}/s`
  return [
    head,
    `sum ${sparkline(points.map((p) => p.sum))}`,
    '',
    ...formatTable(
      ['TIME', 'SUM', 'RATE'],
      points.map((p) => [formatTimestamp(p.t), formatValue(p.sum, series.unit), formatValue(p.rate, rateUnit)])
    )
  ]
}

export function formatExecutions(result: ExecutionsResult): string[] {
  if (result.executions.length === 0) {
    return [stripControlCharacters(`No executions of ${result.sceneKey} in this range`)]
  }
  return formatTable(
    ['EXECUTION', 'ENTITY', 'FIRST SEEN', 'LAST SEEN', 'LINES', 'INSTANCE'],
    result.executions.map((execution) => [
      execution.executionId,
      execution.entityId,
      formatTimestamp(execution.firstSeen),
      formatTimestamp(execution.lastSeen),
      String(execution.logLines),
      execution.instanceId || '-'
    ])
  )
}
