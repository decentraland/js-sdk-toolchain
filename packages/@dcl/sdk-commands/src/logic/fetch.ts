/**
 * Discards an unread fetch Response body.
 *
 * Native fetch (undici) — used here via the global `fetch`, `undici.fetch`, and the
 * fetch component — keeps the keep-alive socket pinned until the body is consumed or
 * cancelled. Any path that discards a response without reading it (a non-ok early
 * return/throw, or a success branch that only checks the status) must drain it first,
 * or the socket leaks until garbage collection.
 *
 * Typed structurally so it accepts both the global `Response` and `undici.Response`.
 */
export async function drainResponse(response: {
  bodyUsed: boolean
  body?: { cancel(): Promise<void> } | null
}): Promise<void> {
  if (!response.bodyUsed) {
    await response.body?.cancel().catch(() => undefined)
  }
}

/**
 * Runs `operation` with a signal aborted after `timeoutMs` or when `signal` aborts, and rejects as soon as it
 * aborts even if the operation doesn't follow it (e.g. a response body that stalls after the headers arrived).
 */
export async function withDeadline<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  options: { timeoutMs?: number; signal?: AbortSignal }
): Promise<T> {
  const signals = [options.signal, options.timeoutMs !== undefined ? AbortSignal.timeout(options.timeoutMs) : undefined]
  const signal = AbortSignal.any(signals.filter((s): s is AbortSignal => !!s))
  if (signal.aborted) throw signal.reason
  let onAbort = () => {}
  const aborted = new Promise<never>((_resolve, reject) => {
    onAbort = () => reject(signal.reason)
    signal.addEventListener('abort', onAbort, { once: true })
  })
  try {
    return await Promise.race([operation(signal), aborted])
  } finally {
    signal.removeEventListener('abort', onAbort)
  }
}
