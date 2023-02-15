/* istanbul ignore file */

type K = unknown | Promise<unknown>

declare const DEBUG: boolean
declare const process: { env: any }

export const __DEV__ =
  (typeof DEBUG === 'boolean' && DEBUG) ||
  (typeof process === 'object' &&
    (process.env?.NODE_ENV !== 'production' || process.env?.NODE_ENV === 'development')) ||
  false

export function checkNotThenable<T extends K>(t: T, error: string): T {
  if (__DEV__) {
    if (t && typeof t === 'object' && typeof (t as unknown as Promise<unknown>).then === 'function') {
      throw new Error(error)
    }
  }
  return t
}
