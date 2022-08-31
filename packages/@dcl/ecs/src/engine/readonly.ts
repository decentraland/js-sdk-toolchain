import { ComponentDefinition } from './component'

/**
 * @internal
 */
export type DeepReadonlyMap<K, V> = ReadonlyMap<
  DeepReadonly<K>,
  DeepReadonly<V>
>
/**
 * @internal
 */
export type DeepReadonlySet<T> = ReadonlySet<DeepReadonly<T>>
/**
 * @internal
 */
export type DeepReadonlyObject<T> = {
  readonly [K in keyof T]: DeepReadonly<T[K]>
}
/**
 * @internal
 */
export type ReadonlyPrimitive =
  | number
  | string
  | number[]
  | string[]
  | boolean
  | boolean[]

/**
 * @internal
 */
export type ReadonlyComponentSchema<
  T extends [ComponentDefinition, ...ComponentDefinition[]]
> = {
  [K in keyof T]: T[K] extends ComponentDefinition
    ? ReturnType<T[K]['get']>
    : never
}

/**
 * @internal
 */
export type DeepReadonly<T> = T extends ReadonlyPrimitive
  ? T
  : T extends Map<infer K, infer V>
  ? DeepReadonlyMap<K, V>
  : T extends Set<infer M>
  ? DeepReadonlySet<M>
  : DeepReadonlyObject<T>

/**
 * @internal
 */
export function deepReadonly<T extends Record<string, unknown>>(
  val: T
): DeepReadonly<T> {
  return Object.freeze({ ...val }) as DeepReadonly<T>
}
