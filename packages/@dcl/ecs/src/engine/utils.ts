import type { DeepReadonly } from '../runtime/Math'
export type { DeepReadonly }

export function deepReadonly<T extends Record<string, unknown>>(
  val: T
): DeepReadonly<T> {
  return Object.freeze({ ...val })
}

export function isNotUndefined<T>(val: T | undefined): val is T {
  return !!val
}
