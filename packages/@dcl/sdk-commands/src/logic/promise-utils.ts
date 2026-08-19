const DEFAULT_CONCURRENCY = 32

export async function mapWithConcurrency<T, R>(
  values: readonly T[],
  mapper: (value: T, index: number) => Promise<R>,
  concurrency: number = DEFAULT_CONCURRENCY
): Promise<R[]> {
  if (values.length === 0) return []

  const results = new Array<R>(values.length)
  let nextIndex = 0

  async function worker(): Promise<void> {
    while (nextIndex < values.length) {
      const currentIndex = nextIndex++
      results[currentIndex] = await mapper(values[currentIndex], currentIndex)
    }
  }

  const workerCount = Math.min(Math.max(1, concurrency), values.length)
  await Promise.all(Array.from({ length: workerCount }, worker))
  return results
}
