import { readFileSync } from 'fs'
import { BenchmarkReport, BenchmarkResult } from './types'

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

function relativeMarginOfError(values: number[], average: number, deviation: number): number {
  if (values.length < 2 || average === 0) return 0
  const tValue = T_DISTRIBUTION_95[values.length - 1] ?? T_DISTRIBUTION_LIMIT
  const standardError = deviation / Math.sqrt(values.length)
  return ((tValue * standardError) / average) * 100
}

function mergeResult(name: string, rounds: BenchmarkResult[]): BenchmarkResult {
  const first = rounds[0]
  const samples = rounds.flatMap((round) => round.samples)
  const averageMilliseconds = mean(samples)
  const deviationMilliseconds = standardDeviation(samples, averageMilliseconds)
  const throughputSamples = samples.map((milliseconds) => first.operationsPerSample / (milliseconds / 1_000))

  return {
    name,
    description: first.description,
    operationsPerSample: first.operationsPerSample,
    iterationsPerSample: first.iterationsPerSample,
    samples,
    medianMilliseconds: median(samples),
    p95Milliseconds: percentile(samples, 0.95),
    meanMilliseconds: averageMilliseconds,
    standardDeviationMilliseconds: deviationMilliseconds,
    relativeMarginOfErrorPercent: relativeMarginOfError(samples, averageMilliseconds, deviationMilliseconds),
    medianOperationsPerSecond: median(throughputSamples)
  }
}

// Pools several single-round reports for one commit into one report. Each round
// is a separate process invocation, so interleaving base and head rounds on the
// same runner lets slow drift (thermal throttling, a noisy neighbour) fall on
// both commits instead of only the one that happened to run second.
function mergeReports(reports: BenchmarkReport[]): BenchmarkReport {
  const [first] = reports
  const resultsByName = new Map<string, BenchmarkResult[]>()

  for (const report of reports) {
    for (const result of report.results) {
      const rounds = resultsByName.get(result.name)
      if (rounds) {
        rounds.push(result)
      } else {
        resultsByName.set(result.name, [result])
      }
    }
  }

  const totalSamples = reports.reduce((total, report) => total + report.metadata.samples, 0)

  return {
    metadata: {
      ...first.metadata,
      samples: totalSamples,
      rounds: reports.length
    },
    results: [...resultsByName.entries()].map(([name, rounds]) => mergeResult(name, rounds))
  }
}

function main(): void {
  const reportFiles = process.argv.slice(2)
  if (reportFiles.length === 0) {
    throw new Error('Usage: tsx benchmarks/ecs/merge-reports.ts <round-report.json> [round-report.json ...]')
  }

  const reports = reportFiles.map((file) => JSON.parse(readFileSync(file, 'utf8')) as BenchmarkReport)
  process.stdout.write(`${JSON.stringify(mergeReports(reports), null, 2)}\n`)
}

main()
