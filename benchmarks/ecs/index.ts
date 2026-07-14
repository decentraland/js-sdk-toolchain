import { execFileSync } from 'child_process'
import { arch, platform } from 'os'
import { performance } from 'perf_hooks'
import { benchmarks } from './workloads'
import { BenchmarkDefinition, BenchmarkOptions, BenchmarkReport, BenchmarkResult } from './types'

const DEFAULT_ENTITY_COUNT = 10_000
const DEFAULT_SAMPLES = 10
const DEFAULT_WARMUPS = 3
const TARGET_SAMPLE_MILLISECONDS = 100
const MAX_ITERATIONS_PER_SAMPLE = 250
const MAX_SETUP_ENTITIES_PER_SAMPLE = 100_000

// Critical values of Student's t-distribution at the two-tailed 95% confidence
// level, indexed by degrees of freedom (sample count minus one). Used to turn a
// sample's standard error into a margin of error, matching the approach popular
// benchmark runners take. Degrees of freedom beyond the table fall back to the
// normal-distribution limit.
const T_DISTRIBUTION_95 = [
  Infinity,
  12.706,
  4.303,
  3.182,
  2.776,
  2.571,
  2.447,
  2.365,
  2.306,
  2.262,
  2.228,
  2.201,
  2.179,
  2.16,
  2.145,
  2.131,
  2.12,
  2.11,
  2.101,
  2.093,
  2.086,
  2.08,
  2.074,
  2.069,
  2.064,
  2.06,
  2.056,
  2.052,
  2.048,
  2.045,
  2.042
]
const T_DISTRIBUTION_LIMIT = 1.96

// Manual garbage collection is exposed by running Node with `--expose-gc`. When
// available it runs before every timed iteration so heap pressure from a
// previous benchmark's setup cannot land inside the measured section as an
// unrelated collection pause.
const exposedGarbageCollector = (globalThis as { gc?: () => void }).gc
const collectGarbage: (() => void) | undefined =
  typeof exposedGarbageCollector === 'function' ? exposedGarbageCollector : undefined

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

function mean(values: number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length
}

function standardDeviation(values: number[], average: number): number {
  if (values.length < 2) return 0
  const variance = values.reduce((total, value) => total + (value - average) ** 2, 0) / (values.length - 1)
  return Math.sqrt(variance)
}

// Relative margin of error: the half-width of the 95% confidence interval
// around the mean, expressed as a percentage of the mean. It is the noise floor
// for a single benchmark — changes smaller than this are indistinguishable from
// measurement jitter.
function relativeMarginOfError(values: number[], average: number, deviation: number): number {
  if (values.length < 2 || average === 0) return 0
  const degreesOfFreedom = values.length - 1
  const tValue = T_DISTRIBUTION_95[degreesOfFreedom] ?? T_DISTRIBUTION_LIMIT
  const standardError = deviation / Math.sqrt(values.length)
  const marginOfError = tValue * standardError
  return (marginOfError / average) * 100
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
  collectGarbage?.()
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
      collectGarbage?.()
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
  const averageMilliseconds = mean(samples)
  const deviationMilliseconds = standardDeviation(samples, averageMilliseconds)

  return {
    name: benchmark.name,
    description: benchmark.description,
    operationsPerSample,
    iterationsPerSample,
    samples,
    medianMilliseconds: median(samples),
    p95Milliseconds: percentile(samples, 0.95),
    meanMilliseconds: averageMilliseconds,
    standardDeviationMilliseconds: deviationMilliseconds,
    relativeMarginOfErrorPercent: relativeMarginOfError(samples, averageMilliseconds, deviationMilliseconds),
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
  console.log(
    report.metadata.garbageCollected
      ? 'Manual garbage collection: enabled'
      : 'Manual garbage collection: disabled (run with --expose-gc for lower variance)'
  )
  console.log('')

  for (const result of report.results) {
    console.log(result.name)
    console.log(`  median: ${formatNumber(result.medianMilliseconds)} ms`)
    console.log(`  p95:    ${formatNumber(result.p95Milliseconds)} ms`)
    console.log(`  ±:      ${formatNumber(result.relativeMarginOfErrorPercent)}% (95% confidence)`)
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
      rounds: 1,
      garbageCollected: collectGarbage !== undefined,
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
