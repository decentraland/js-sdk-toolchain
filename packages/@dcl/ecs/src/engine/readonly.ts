import { ComponentDefinition } from './component'

/**
 * @public
 */
export type DeepReadonlyMap<K, V> = ReadonlyMap<K, DeepReadonly<V>>
/**
 * @public
 */
export type DeepReadonlySet<T> = ReadonlySet<DeepReadonly<T>>
/**
 * @public
 */
export type DeepReadonlyObject<T> = {
  readonly [K in keyof T]: DeepReadonly<T[K]>
}
/**
 * @public
 */
export type ReadonlyPrimitive = number | string | boolean

/**
 * @public
 */
export type ReadonlyComponentSchema<T extends [ComponentDefinition<unknown>, ...ComponentDefinition<unknown>[]]> = {
  [K in keyof T]: T[K] extends ComponentDefinition<unknown> ? ReturnType<T[K]['get']> : never
}

/**
 * @public
 */
export type DeepReadonly<T> = T extends ReadonlyPrimitive
  ? T
  : T extends Array<infer K>
    ? ReadonlyArray<DeepReadonly<K>>
    : T extends Map<infer K, infer V>
      ? DeepReadonlyMap<K, V>
      : T extends Set<infer M>
        ? DeepReadonlySet<M>
        : DeepReadonlyObject<T>

/**
 * @internal
 */
export function deepReadonly<T>(val: T): DeepReadonly<T> {
  // A component can be defined straight from a primitive or array schema, not
  // only from a Map, which is why this is no longer constrained to an object.
  // Spreading those threw the value away: a number came back as {}, an array
  // as an object keyed by index.
  if (val === null || typeof val !== 'object') {
    return val as DeepReadonly<T>
  }

  if (Array.isArray(val)) {
    return Object.freeze([...val]) as DeepReadonly<T>
  }

  return Object.freeze({ ...(val as Record<string, unknown>) }) as DeepReadonly<T>
}
