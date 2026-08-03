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
