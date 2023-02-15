import { DeepReadonly } from '../engine/readonly'
import { ByteBuffer } from '../serialization/ByteBuffer'

/**
 * SchemaDescription primitive values.
 * @public
 */
export type SchemaDescriptionPrimitive = string | number | boolean | null

/**
 * SchemaDescription map as param of primitive values.
 * @public
 */
export type SchemaDescriptionMap = {
  [key: string]: SchemaDescriptionPrimitive | SchemaDescriptionMap | SchemaDescriptionArray
}

/**
 * SchemaDescription array as param of primitive values.
 * @public
 */
export type SchemaDescriptionArray = Array<SchemaDescriptionPrimitive | SchemaDescriptionMap | SchemaDescriptionArray>

/**
 * SchemaDescription must specify the type, and it can has more primitives params.
 * Functions are not allowed.
 * @public
 */
export type SchemaDescription = {
  type: string
} & SchemaDescriptionMap

/**
 * @public
 */
export interface ISchema<T = any> {
  serialize(value: DeepReadonly<T>, builder: ByteBuffer): void
  deserialize(reader: ByteBuffer): T
  create(): T
  extend?: (base: Partial<DeepReadonly<T>> | undefined) => T
  description: SchemaDescription
}
