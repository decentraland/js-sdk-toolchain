import { DeepReadonly } from '../engine/readonly'
import { ByteBuffer } from '../serialization/ByteBuffer'

/**
 * @public
 */
export type JsonPrimitive = string | number | boolean | null

/**
 * @public
 */
export type JsonMap = {
  [key: string]: JsonPrimitive | JsonMap | JsonArray
}

/**
 * @public
 */
export type JsonArray = Array<JsonPrimitive | JsonMap | JsonArray>

/**
 * SchemaDescription must specify the type, and it can has more primitives params.
 * Functions are not allowed.
 * @public
 */
export type JsonSchemaExtended = {
  type: 'object' | 'number' | 'integer' | 'string' | 'array' | 'boolean'
  serializationType:
    | 'boolean'
    | 'enum-int'
    | 'enum-string'
    | 'int8'
    | 'int16'
    | 'int32'
    | 'int64'
    | 'float32'
    | 'float64'
    | 'vector3'
    | 'color3'
    | 'quaternion'
    | 'color4'
    | 'map'
    | 'optional'
    | 'entity'
    | 'array'
    | 'utf8-string'
    | 'protocol-buffer'
    | 'transform'
    | 'unknown'
} & JsonMap

/**
 * @public
 */
export interface ISchema<T = any> {
  serialize(value: DeepReadonly<T>, builder: ByteBuffer): void
  deserialize(reader: ByteBuffer): T
  create(): T
  extend?: (base: Partial<DeepReadonly<T>> | undefined) => T
  jsonSchema: JsonSchemaExtended
}
