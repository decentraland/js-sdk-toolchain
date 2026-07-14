import { execFileSync } from 'child_process'
import { arch, platform } from 'os'
import { performance } from 'perf_hooks'
import { benchmarks } from './workloads'
import { BenchmarkDefinition, BenchmarkOptions, BenchmarkReport, BenchmarkResult } from './types'

const DEFAULT_ENTITY_COUNT = 10_000
const DEFAULT_SAMPLES = 10
const DEFAULT_WARMUPS = 2
const TARGET_SAMPLE_MILLISECONDS = 100
const MAX_ITERATIONS_PER_SAMPLE = 250
const MAX_SETUP_ENTITIES_PER_SAMPLE = 100_000

type CliOptions = BenchmarkOptions & {
  json: boolean
}

function parsePositiveInteger(value: string | undefined, flag: string): number {
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${flag} must be a positive integer`)
  }
  return parsed
}

function parseArguments(args: string[]): CliOptions {
  const options: CliOptions = {
    entityCount: DEFAULT_ENTITY_COUNT,
    samples: DEFAULT_SAMPLES,
    warmups: DEFAULT_WARMUPS,
    json: false
  }

  for (let index = 0; index < args.length; index++) {
    const argument = args[index]

    if (argument === '--json') {
      options.json = true
    } else if (argument === '--entities') {
      options.entityCount = parsePositiveInteger(args[++index], argument)
    } else if (argument === '--samples') {
      options.samples = parsePositiveInteger(args[++index], argument)
    } else if (argument === '--warmups') {
      options.warmups = parsePositiveInteger(args[++index], argument)
    } else {
      throw new Error(`Unknown argument: ${argument}`)
    }
  }

  return options
}

function percentile(values: number[], quantile: number): number {
  const sorted = [...values].sort((left, right) => left - right)
  const index = Math.max(0, Math.ceil(sorted.length * quantile) - 1)
  return sorted[index]
}

function median(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle]
}

async function executeTask(benchmark: BenchmarkDefinition, options: BenchmarkOptions): Promise<number> {
  const task = await benchmark.setup(options)
  const checksum = await task.run()

  if (!Number.isFinite(checksum)) {
    throw new Error(`${benchmark.name} produced an invalid checksum`)
  }

  return task.operations
}

async function measureBenchmark(benchmark: BenchmarkDefinition, options: BenchmarkOptions): Promise<BenchmarkResult> {
  for (let index = 0; index < options.warmups; index++) {
    await executeTask(benchmark, options)
  }

  const calibrationTask = await benchmark.setup(options)
  const calibrationStart = performance.now()
  const calibrationChecksum = await calibrationTask.run()
  const calibrationElapsed = performance.now() - calibrationStart

  if (!Number.isFinite(calibrationChecksum) || calibrationElapsed <= 0) {
    throw new Error(`${benchmark.name} produced an invalid calibration sample`)
  }

  const iterationsPerSample = Math.min(
    MAX_ITERATIONS_PER_SAMPLE,
    Math.max(1, Math.floor(MAX_SETUP_ENTITIES_PER_SAMPLE / options.entityCount)),
    Math.max(1, Math.ceil(TARGET_SAMPLE_MILLISECONDS / calibrationElapsed))
  )
  const samples: number[] = []
  let operationsPerSample = 0

  for (let index = 0; index < options.samples; index++) {
    let elapsed = 0

    for (let iteration = 0; iteration < iterationsPerSample; iteration++) {
      const task = await benchmark.setup(options)
      const start = performance.now()
      const checksum = await task.run()
      elapsed += performance.now() - start

      if (!Number.isFinite(checksum)) {
        throw new Error(`${benchmark.name} produced an invalid sample`)
      }

      operationsPerSample = task.operations
    }

    samples.push(elapsed / iterationsPerSample)
  }

  const throughputSamples = samples.map((milliseconds) => operationsPerSample / (milliseconds / 1_000))

  return {
    name: benchmark.name,
    description: benchmark.description,
    operationsPerSample,
    iterationsPerSample,
    samples,
    medianMilliseconds: median(samples),
    p95Milliseconds: percentile(samples, 0.95),
    medianOperationsPerSecond: median(throughputSamples)
  }
}

function getCommit(): string {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim()
  } catch {
    return process.env.GITHUB_SHA?.slice(0, 8) ?? 'unknown'
  }
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value)
}

function printHumanReadable(report: BenchmarkReport): void {
  console.log(
    `ECS benchmarks (${report.metadata.entityCount} entities, ${report.metadata.samples} samples, ${report.metadata.warmups} warmups)`
  )
  console.log(`Node ${report.metadata.node} on ${report.metadata.platform}/${report.metadata.architecture}`)
  console.log('')

  for (const result of report.results) {
    console.log(result.name)
    console.log(`  median: ${formatNumber(result.medianMilliseconds)} ms`)
    console.log(`  p95:    ${formatNumber(result.p95Milliseconds)} ms`)
    console.log(`  rate:   ${formatNumber(result.medianOperationsPerSecond)} ops/s`)
    if (result.iterationsPerSample > 1) {
      console.log(`  batch:  ${result.iterationsPerSample} iterations per sample`)
    }
  }
}

async function main(): Promise<void> {
  const cliOptions = parseArguments(process.argv.slice(2))
  const options: BenchmarkOptions = {
    entityCount: cliOptions.entityCount,
    samples: cliOptions.samples,
    warmups: cliOptions.warmups
  }
  const results: BenchmarkResult[] = []

  for (const benchmark of benchmarks) {
    results.push(await measureBenchmark(benchmark, options))
  }

  const report: BenchmarkReport = {
    metadata: {
      commit: getCommit(),
      node: process.version,
      platform: platform(),
      architecture: arch(),
      entityCount: options.entityCount,
      samples: options.samples,
      warmups: options.warmups,
      timestamp: new Date().toISOString()
    },
    results
  }

  if (cliOptions.json) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    printHumanReadable(report)
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
