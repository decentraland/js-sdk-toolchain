import { DeepReadonly } from '../engine/readonly'
import { ByteBuffer } from '../serialization/ByteBuffer'
import { ISchema } from './ISchema'
import { ToOptional } from './typing'

/**
 * @public
 */
export interface Spec {
  [key: string]: ISchema
}

/**
 * @public
 */
export type MapResult<T extends Spec> = ToOptional<{
  [K in keyof T]: T[K] extends ISchema ? ReturnType<T[K]['deserialize']> : T[K] extends Spec ? MapResult<T[K]> : never
}>

/**
 * @public
 */
export type MapResultWithOptional<T extends Spec> = ToOptional<{
  [K in keyof T]?: T[K] extends ISchema ? ReturnType<T[K]['deserialize']> : T[K] extends Spec ? MapResult<T[K]> : never
}>

/**
 * @internal
 */
export const IMap = <T extends Spec>(spec: T, defaultValue?: Partial<MapResult<T>>): ISchema<MapResult<T>> => {
  const specReflection = Object.keys(spec).reduce((specReflection, currentKey) => {
    specReflection[currentKey] = spec[currentKey].jsonSchema
    return specReflection
  }, {} as Record<string, any>)

  return {
    serialize(value: DeepReadonly<MapResult<T>>, builder: ByteBuffer): void {
      for (const key in spec) {
        spec[key].serialize((value as any)[key], builder)
      }
    },
    deserialize(reader: ByteBuffer): MapResult<T> {
      const newValue: MapResult<T> = {} as any
      for (const key in spec) {
        ;(newValue as any)[key] = spec[key].deserialize(reader)
      }
      return newValue
    },
    create() {
      const newValue: MapResult<T> = {} as any
      for (const key in spec) {
        ;(newValue as any)[key] = spec[key].create()
      }
      return { ...newValue, ...defaultValue }
    },
    extend: (base: Partial<DeepReadonly<MapResult<T>>> | undefined) => {
      const newValue: MapResult<T> = {} as any
      for (const key in spec) {
        ;(newValue as any)[key] = spec[key].create()
      }
      return { ...newValue, ...defaultValue, ...base }
    },
    jsonSchema: {
      type: 'object',
      properties: specReflection,
      serializationType: 'map'
    }
  }
}
