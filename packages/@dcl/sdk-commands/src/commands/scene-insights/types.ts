// Response shapes of multiplayer-scenes-insights-service (its docs/openapi.yaml).

export interface LogEntry {
  id: string
  timestamp: string
  level: 'debug' | 'info' | 'warn' | 'error'
  source: 'scene' | 'engine' | 'stderr' | 'unknown'
  executionId: string
  entityId: string
  message: string
  truncated: boolean
}

export interface LogSearchResult {
  sceneKey: string
  logs: LogEntry[]
  nextCursor: string | null
  retentionStart: string
}

export interface Execution {
  executionId: string
  entityId: string
  firstSeen: string
  lastSeen: string
  instanceId: string
  logLines: number
}

export interface ExecutionsResult {
  sceneKey: string
  executions: Execution[]
  retentionStart: string
}

export interface MetricName {
  name: string
  type: 'gauge' | 'sum'
  unit: string
}

export interface MetricNamesResult {
  sceneKey: string
  from: string
  to: string
  metrics: MetricName[]
}

export interface GaugePoint {
  t: string
  avg: number | null
  max: number | null
}

export interface SumPoint {
  t: string
  sum: number | null
  rate: number | null
}

export interface MetricSeries {
  sceneKey: string
  metric: string
  type: 'gauge' | 'sum' | null
  unit: string
  rateUnit?: string
  stepSeconds: number
  from: string
  to: string
  points: Array<GaugePoint | SumPoint>
}
