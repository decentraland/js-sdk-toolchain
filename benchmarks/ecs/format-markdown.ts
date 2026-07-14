import { readFileSync } from 'fs'
import { BenchmarkReport } from './types'

function formatNumber(value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(value)
}

function formatReport(report: BenchmarkReport): string {
  const warmupLabel = report.metadata.warmups === 1 ? 'warmup' : 'warmups'
  const lines = [
    '<!-- ecs-benchmark-results -->',
    '## ECS benchmark results',
    '',
    `Commit: \`${report.metadata.commit}\``,
    '',
    `Environment: Node ${report.metadata.node} on ${report.metadata.platform}/${
      report.metadata.architecture
    }; ${formatNumber(report.metadata.entityCount, 0)} entities; ${report.metadata.samples} samples; ${
      report.metadata.warmups
    } ${warmupLabel}.`,
    '',
    '| Benchmark | Median | p95 | Median throughput |',
    '| --- | ---: | ---: | ---: |'
  ]

  for (const result of report.results) {
    lines.push(
      `| \`${result.name}\` | ${formatNumber(result.medianMilliseconds)} ms | ${formatNumber(
        result.p95Milliseconds
      )} ms | ${formatNumber(result.medianOperationsPerSecond)} ops/s |`
    )
  }

  lines.push('', '_Updated automatically for the latest commit on this pull request._')
  return lines.join('\n')
}

function main(): void {
  const reportFile = process.argv[2]
  if (!reportFile) {
    throw new Error('Usage: tsx benchmarks/ecs/format-markdown.ts <benchmark-report.json>')
  }

  const report = JSON.parse(readFileSync(reportFile, 'utf8')) as BenchmarkReport
  process.stdout.write(`${formatReport(report)}\n`)
}

main()
