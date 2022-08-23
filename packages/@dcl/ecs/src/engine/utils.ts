import type { DeepReadonly } from '../Math'
import { ISchema } from '../schemas/ISchema'
import { MapSchemaType } from '../schemas/Map'
import { Result, Spec } from '../types'
import { ComponentDefinition, ComponentType } from './component'
import { IEngine } from './types'
export type { DeepReadonly }

export function deepReadonly<T extends Record<string, unknown>>(
  val: T
): DeepReadonly<T> {
  // Fail only on development due to perf issues
  // if (isProd()) {
  //   return val
  // }

  return Object.freeze({ ...val })
}

export function isNotUndefined<T>(val: T | undefined): val is T {
  return !!val
}

export function defineComponentWithPartials<T extends Spec, T2 = ComponentType<MapSchemaType<T>>>(
  engine: IEngine,
  spec: Spec,
  componentId: number,
  constructorDefault: Result<T>
): ComponentDefinition<MapSchemaType<T>, T2> {

}
