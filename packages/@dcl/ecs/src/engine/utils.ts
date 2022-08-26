import type { DeepReadonly } from '../Math'
export type { DeepReadonly }

export function deepReadonly<T extends Record<string, unknown>>(
  val: T
): DeepReadonly<T> {
  return typeof val === 'object' && !Array.isArray(val)
    ? Object.freeze({ ...val })
    : val
}

export function isNotUndefined<T>(val: T | undefined): val is T {
  return !!val
}
