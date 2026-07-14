import { readFileSync } from 'fs'
import { BenchmarkReport, BenchmarkResult } from './types'

type ChangeEstimate = {
  changePercent: number
  uncertaintyPercent: number
  significant: boolean
}

function formatNumber(value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(value)
}

// Estimate the head-vs-base change and how confident we can be in it. Base and
// head are measured on the same runner, so the point estimate is the ratio of
// their pooled medians. The uncertainty combines each commit's relative margin
// of error in quadrature — the standard propagation for two independent
// measurements — giving the 95% confidence interval of the change. A change
// smaller than that interval cannot be told apart from runner noise.
function estimateChange(base: BenchmarkResult, head: BenchmarkResult): ChangeEstimate {
  if (base.medianMilliseconds === 0) {
    return { changePercent: 0, uncertaintyPercent: 0, significant: false }
  }
  const changePercent = ((head.medianMilliseconds - base.medianMilliseconds) / base.medianMilliseconds) * 100
  const uncertaintyPercent = Math.hypot(base.relativeMarginOfErrorPercent, head.relativeMarginOfErrorPercent)
  return {
    changePercent,
    uncertaintyPercent,
    significant: Math.abs(changePercent) > uncertaintyPercent
  }
}

function formatChangeCell(estimate: ChangeEstimate): string {
  const sign = estimate.changePercent > 0 ? '+' : ''
  const marker = estimate.significant ? '' : ' ≈'
  return `${sign}${formatNumber(estimate.changePercent)}% (±${formatNumber(estimate.uncertaintyPercent)}%)${marker}`
}

function howToRead(): string[] {
  return [
    '<details>',
    '<summary>How to read these numbers</summary>',
    '',
    'Base and head are measured on the **same runner**, interleaved one round at a time, so both commits see the same machine and the same moment-to-moment noise. GitHub runners are shared cloud VMs whose speed drifts by a few percent from minute to minute, so an absolute millisecond value only means something next to the base measured beside it — do not compare it to a previous run on a different runner.',
    '',
    '- **Change** is the shift in median latency from base to head; `(±x%)` is its 95% confidence interval, combining the run-to-run margin of error of both commits.',
    '- **`≈`** marks a change whose interval includes zero: it cannot be told apart from runner noise, so read that row as flat.',
    '- Only rows **without** `≈` are likely real regressions or improvements.',
    '</details>'
  ]
}

function formatReport(report: BenchmarkReport, baseReport?: BenchmarkReport): string {
  const warmupLabel = report.metadata.warmups === 1 ? 'warmup' : 'warmups'
  const roundLabel = report.metadata.rounds === 1 ? 'round' : 'interleaved rounds'
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
    } ${roundLabel}; ${report.metadata.warmups} ${warmupLabel}; garbage collection ${
      report.metadata.garbageCollected ? 'enabled' : 'disabled'
    }.`,
    ''
  ]

  if (baseReport) {
    lines.push(...howToRead(), '')
  }

  lines.push(
    baseReport
      ? '| Benchmark | Base median | Head median | Change (95% CI) | Head throughput |'
      : '| Benchmark | Median | ±95% | p95 | Median throughput |',
    baseReport ? '| --- | ---: | ---: | ---: | ---: |' : '| --- | ---: | ---: | ---: | ---: |'
  )

  const baseResults = new Map(baseReport?.results.map((result) => [result.name, result]))
  for (const result of report.results) {
    const baseResult = baseResults.get(result.name)
    if (baseReport) {
      const change = baseResult ? formatChangeCell(estimateChange(baseResult, result)) : 'n/a'
      lines.push(
        `| \`${result.name}\` | ${
          baseResult ? `${formatNumber(baseResult.medianMilliseconds)} ms` : 'n/a'
        } | ${formatNumber(result.medianMilliseconds)} ms | ${change} | ${formatNumber(
          result.medianOperationsPerSecond
        )} ops/s |`
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
      '_Change is the shift in median latency from base to head; negative is faster. `(±x%)` is the 95% confidence interval of that shift, and `≈` marks a change within it — i.e. within measurement noise._'
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
