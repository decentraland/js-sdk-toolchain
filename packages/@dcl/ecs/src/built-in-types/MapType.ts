import { ByteBuffer } from '../serialization/ByteBuffer'
import { EcsType } from './EcsType'
import { ToOptional } from './typing'

/**
 * @public
 */
export interface Spec {
  [key: string]: EcsType
}

/**
 * @public
 */
export type Result<T extends Spec> = ToOptional<{
  [K in keyof T]: T[K] extends EcsType
    ? ReturnType<T[K]['deserialize']>
    : T[K] extends Spec
    ? Result<T[K]>
    : never
}>

/**
 * @public
 */
export function MapType<T extends Spec>(spec: T): EcsType<Result<T>> {
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
    }
  }
}
