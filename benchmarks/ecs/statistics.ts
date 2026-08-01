// Critical values of Student's t-distribution at the two-tailed 95% confidence
// level, indexed by degrees of freedom (sample count minus one). Degrees of
// freedom beyond the table fall back to the normal-distribution limit.
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

// Fraction of the slowest samples dropped before computing statistics. Timing
// noise on shared runners is one-sided — scheduling, garbage collection and
// co-tenant bursts only ever make a sample slower, never faster — so trimming
// the slow tail removes contamination without discarding clean measurements. It
// leaves the central tendency untouched, so a genuine regression (which shifts
// every sample) still shows; it only stops a lone spike from inflating variance.
const SLOW_TRIM_FRACTION = 0.2
const MINIMUM_SAMPLES_TO_TRIM = 5

export type SampleSummary = {
  trimmed: number[]
  median: number
  p95: number
  mean: number
  standardDeviation: number
  relativeMarginOfErrorPercent: number
}

export function trimSlowest(samples: number[]): number[] {
  const sorted = [...samples].sort((left, right) => left - right)
  if (sorted.length < MINIMUM_SAMPLES_TO_TRIM) return sorted
  const trimCount = Math.floor(sorted.length * SLOW_TRIM_FRACTION)
  return trimCount > 0 ? sorted.slice(0, sorted.length - trimCount) : sorted
}

export function percentile(values: number[], quantile: number): number {
  const sorted = [...values].sort((left, right) => left - right)
  const index = Math.max(0, Math.ceil(sorted.length * quantile) - 1)
  return sorted[index]
}

export function median(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle]
}

export function mean(values: number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length
}

export function standardDeviation(values: number[], average: number): number {
  if (values.length < 2) return 0
  const variance = values.reduce((total, value) => total + (value - average) ** 2, 0) / (values.length - 1)
  return Math.sqrt(variance)
}

// Relative margin of error: the half-width of the 95% confidence interval around
// the mean, as a percentage of the mean. It is the noise floor for a benchmark —
// changes smaller than it are indistinguishable from measurement jitter.
export function relativeMarginOfError(values: number[], average: number, deviation: number): number {
  if (values.length < 2 || average === 0) return 0
  const tValue = T_DISTRIBUTION_95[values.length - 1] ?? T_DISTRIBUTION_LIMIT
  const standardError = deviation / Math.sqrt(values.length)
  return ((tValue * standardError) / average) * 100
}

// Summarise a set of raw samples: trim the slow tail, then derive every
// statistic from the trimmed view so callers report identical numbers.
export function summarize(samples: number[]): SampleSummary {
  const trimmed = trimSlowest(samples)
  const average = mean(trimmed)
  const deviation = standardDeviation(trimmed, average)
  return {
    trimmed,
    median: median(trimmed),
    p95: percentile(trimmed, 0.95),
    mean: average,
    standardDeviation: deviation,
    relativeMarginOfErrorPercent: relativeMarginOfError(trimmed, average, deviation)
  }
}
