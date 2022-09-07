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
export type Result<T extends Spec> = ToOptional<{
  [K in keyof T]: T[K] extends ISchema
    ? ReturnType<T[K]['deserialize']>
    : T[K] extends Spec
    ? Result<T[K]>
    : never
}>

export type MapSchemaType<T extends Spec> = ISchema<Result<T>>

/**
 * @public
 */
export function IMap<T extends Spec>(spec: T): ISchema<Result<T>> {
  return {
    serialize(value: Result<T>, builder: ByteBuffer): void {
      for (const key in spec) {
        // TODO: as any
        spec[key].serialize((value as any)[key], builder)
      }
    },
    deserialize(reader: ByteBuffer): Result<T> {
      const newValue: Result<T> = {} as any
      for (const key in spec) {
        // TODO: as any
        ;(newValue as any)[key] = spec[key].deserialize(reader)
      }
      return newValue
    },
    create() {
      const newValue: Result<T> = {} as any
      for (const key in spec) {
        // TODO: as any
        ;(newValue as any)[key] = spec[key].create()
      }
      return newValue
    }
  }
}
