type K = unknown | Promise<unknown>

declare let globalThis: {
  DEBUG: boolean
}
export function checkNotThenable<T extends K>(t: T, error: string): T {
  if (globalThis.DEBUG) {
    if (t && typeof t === 'object' && typeof (t as unknown as Promise<unknown>).then === 'function') {
      throw new Error(error)
    }
  }
  return t
}
