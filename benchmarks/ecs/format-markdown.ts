import { readFileSync } from 'fs'
import { BenchmarkReport, BenchmarkResult } from './types'

function formatNumber(value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(value)
}

function formatChange(base: number, head: number): string {
  if (base === 0) return 'n/a'
  const change = ((head - base) / base) * 100
  return `${change > 0 ? '+' : ''}${formatNumber(change)}%`
}

// A change is only meaningful when it exceeds the combined measurement noise of
// both commits. Adding the two relative margins of error gives a conservative
// band: within it, the difference cannot be distinguished from runner jitter, so
// it is flagged rather than read as a real regression or improvement.
function isSignificantChange(base: BenchmarkResult, head: BenchmarkResult): boolean {
  if (base.medianMilliseconds === 0) return false
  const change = Math.abs(((head.medianMilliseconds - base.medianMilliseconds) / base.medianMilliseconds) * 100)
  const noiseBand = base.relativeMarginOfErrorPercent + head.relativeMarginOfErrorPercent
  return change > noiseBand
}

function formatReport(report: BenchmarkReport, baseReport?: BenchmarkReport): string {
  const warmupLabel = report.metadata.warmups === 1 ? 'warmup' : 'warmups'
  const lines = [
    '<!-- ecs-benchmark-results -->',
    '## ECS benchmark results',
    '',
    baseReport
      ? `Base: \`${baseReport.metadata.commit}\` · Head: \`${report.metadata.commit}\``
      : `Commit: \`${report.metadata.commit}\``,
    '',
    `Environment: Node ${report.metadata.node} on ${report.metadata.platform}/${
      report.metadata.architecture
    }; ${formatNumber(report.metadata.entityCount, 0)} entities; ${report.metadata.samples} samples across ${
      report.metadata.rounds
    } ${report.metadata.rounds === 1 ? 'round' : 'interleaved rounds'}; ${
      report.metadata.warmups
    } ${warmupLabel}; garbage collection ${report.metadata.garbageCollected ? 'enabled' : 'disabled'}.`,
    '',
    baseReport
      ? '| Benchmark | Base median | Head median | Change | Head ±95% | Head throughput |'
      : '| Benchmark | Median | ±95% | p95 | Median throughput |',
    baseReport ? '| --- | ---: | ---: | ---: | ---: | ---: |' : '| --- | ---: | ---: | ---: | ---: |'
  ]

  const baseResults = new Map(baseReport?.results.map((result) => [result.name, result]))
  for (const result of report.results) {
    const baseResult = baseResults.get(result.name)
    if (baseReport) {
      const change = baseResult
        ? `${formatChange(baseResult.medianMilliseconds, result.medianMilliseconds)}${
            isSignificantChange(baseResult, result) ? '' : ' ≈'
          }`
        : 'n/a'
      lines.push(
        `| \`${result.name}\` | ${
          baseResult ? `${formatNumber(baseResult.medianMilliseconds)} ms` : 'n/a'
        } | ${formatNumber(result.medianMilliseconds)} ms | ${change} | ±${formatNumber(
          result.relativeMarginOfErrorPercent
        )}% | ${formatNumber(result.medianOperationsPerSecond)} ops/s |`
      )
    } else {
      lines.push(
        `| \`${result.name}\` | ${formatNumber(result.medianMilliseconds)} ms | ±${formatNumber(
          result.relativeMarginOfErrorPercent
        )}% | ${formatNumber(result.p95Milliseconds)} ms | ${formatNumber(result.medianOperationsPerSecond)} ops/s |`
      )
    }
  }

  if (baseReport) {
    lines.push(
      '',
      '_Change compares median latency on the same runner; negative is faster. `±95%` is the relative margin of error at 95% confidence — a `≈` marks changes smaller than the combined margin of both commits, i.e. within measurement noise._'
    )
  }
  lines.push('', '_Updated automatically for the latest commit on this pull request._')
  return lines.join('\n')
}

function main(): void {
  const reportFile = process.argv[2]
  if (!reportFile) {
    throw new Error('Usage: tsx benchmarks/ecs/format-markdown.ts <head-report.json> [base-report.json]')
  }

  const report = JSON.parse(readFileSync(reportFile, 'utf8')) as BenchmarkReport
  const baseReportFile = process.argv[3]
  const baseReport = baseReportFile ? (JSON.parse(readFileSync(baseReportFile, 'utf8')) as BenchmarkReport) : undefined
  process.stdout.write(`${formatReport(report, baseReport)}\n`)
}

main()
