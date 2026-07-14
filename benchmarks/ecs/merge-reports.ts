import { readFileSync } from 'fs'
import { BenchmarkReport, BenchmarkResult } from './types'
import { median, summarize } from './statistics'

function mergeResult(name: string, rounds: BenchmarkResult[]): BenchmarkResult {
  const first = rounds[0]
  const samples = rounds.flatMap((round) => round.samples)
  const summary = summarize(samples)
  const throughputSamples = summary.trimmed.map((milliseconds) => first.operationsPerSample / (milliseconds / 1_000))

  return {
    name,
    description: first.description,
    operationsPerSample: first.operationsPerSample,
    iterationsPerSample: first.iterationsPerSample,
    samples,
    medianMilliseconds: summary.median,
    p95Milliseconds: summary.p95,
    meanMilliseconds: summary.mean,
    standardDeviationMilliseconds: summary.standardDeviation,
    relativeMarginOfErrorPercent: summary.relativeMarginOfErrorPercent,
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
