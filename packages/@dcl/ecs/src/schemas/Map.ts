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
  [K in keyof T]: T[K] extends ISchema
    ? ReturnType<T[K]['deserialize']>
    : T[K] extends Spec
    ? MapResult<T[K]>
    : never
}>

/**
 * @public
 */
export type MapResultWithOptional<T extends Spec> = ToOptional<{
  [K in keyof T]?: T[K] extends ISchema
    ? ReturnType<T[K]['deserialize']>
    : T[K] extends Spec
    ? MapResult<T[K]>
    : never
}>

export type MapSchemaType<T extends Spec> = ISchema<MapResult<T>>

/**
 * @public
 */
export function IMap<T extends Spec>(spec: T): ISchema<MapResult<T>> {
  return {
    serialize(value: MapResult<T>, builder: ByteBuffer): void {
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
      return newValue
    }
  }
}
