export type BenchmarkOptions = {
  entityCount: number
  samples: number
  warmups: number
}

export type BenchmarkTask = {
  operations: number
  run(): number | Promise<number>
}

export type BenchmarkDefinition = {
  name: string
  description: string
  setup(options: BenchmarkOptions): BenchmarkTask | Promise<BenchmarkTask>
}

export type BenchmarkResult = {
  name: string
  description: string
  operationsPerSample: number
  iterationsPerSample: number
  samples: number[]
  medianMilliseconds: number
  p95Milliseconds: number
  meanMilliseconds: number
  standardDeviationMilliseconds: number
  relativeMarginOfErrorPercent: number
  medianOperationsPerSecond: number
}

export type BenchmarkReport = {
  metadata: {
    commit: string
    node: string
    platform: string
    architecture: string
    entityCount: number
    samples: number
    warmups: number
    rounds: number
    garbageCollected: boolean
    timestamp: string
  }
  results: BenchmarkResult[]
}
