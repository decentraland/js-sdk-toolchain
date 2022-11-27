export function checkNotThenable<T>(t: T, error: string): T {
  if ((globalThis as any).DEBUG) {
    if (t && typeof t === 'object' && typeof (t as any).then === 'function') {
      throw new Error(error)
    }
  }
  return t
}
