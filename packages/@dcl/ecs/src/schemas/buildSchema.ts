import { IArray } from './Array'
import { Bool } from './basic/Boolean'
import { IntEnum, StringEnum } from './basic/Enum'
import { Float32, Float64 } from './basic/Float'
import { Int16, Int32, Int64, Int8 } from './basic/Integer'
import { EcsString } from './basic/String'
import { Color3Schema } from './custom/Color3'
import { Color4Schema } from './custom/Color4'
import { EntitySchema } from './custom/Entity'
import { QuaternionSchema } from './custom/Quaternion'
import { Vector3Schema } from './custom/Vector3'
import { ISchema, JsonSchemaExtended } from './ISchema'
import { IMap } from './Map'
import { IOptional } from './Optional'

const primitiveSchemas = {
  [Bool.jsonSchema.serializationType]: Bool,
  [EcsString.jsonSchema.serializationType]: EcsString,
  [Float32.jsonSchema.serializationType]: Float32,
  [Float64.jsonSchema.serializationType]: Float64,
  [Int8.jsonSchema.serializationType]: Int8,
  [Int16.jsonSchema.serializationType]: Int16,
  [Int32.jsonSchema.serializationType]: Int32,
  [Int64.jsonSchema.serializationType]: Int64,
  [Vector3Schema.jsonSchema.serializationType]: Vector3Schema,
  [QuaternionSchema.jsonSchema.serializationType]: QuaternionSchema,
  [Color3Schema.jsonSchema.serializationType]: Color3Schema,
  [Color4Schema.jsonSchema.serializationType]: Color4Schema,
  [EntitySchema.jsonSchema.serializationType]: EntitySchema
}

/**
 * Create an ISchema object from the json-schema
 * @param jsonSchema
 * @returns a ISchema or fail for unsupported json-schema
 */
export function jsonSchemaToSchema(jsonSchema: JsonSchemaExtended): ISchema<any> {
  if (primitiveSchemas[jsonSchema.serializationType]) {
    return primitiveSchemas[jsonSchema.serializationType]
  }

  if (jsonSchema.serializationType === 'map') {
    const mapJsonSchema = jsonSchema as JsonSchemaExtended & { properties: Record<string, JsonSchemaExtended> }
    const spec: Record<string, ISchema> = {}
    for (const key in mapJsonSchema.properties) {
      spec[key] = jsonSchemaToSchema(mapJsonSchema.properties[key])
    }
    return IMap(spec)
  }

  if (jsonSchema.serializationType === 'optional') {
    const withItemsJsonSchema = jsonSchema as JsonSchemaExtended & { optionalJsonSchema: JsonSchemaExtended }
    return IOptional(jsonSchemaToSchema(withItemsJsonSchema.optionalJsonSchema))
  }

  if (jsonSchema.serializationType === 'array') {
    const withItemsJsonSchema = jsonSchema as JsonSchemaExtended & { items: JsonSchemaExtended }
    return IArray(jsonSchemaToSchema(withItemsJsonSchema.items))
  }

  if (jsonSchema.serializationType === 'enum-int') {
    const enumJsonSchema = jsonSchema as JsonSchemaExtended & { enumObject: Record<any, any>; default: number }
    return IntEnum(enumJsonSchema.enumObject, enumJsonSchema.default)
  }
  if (jsonSchema.serializationType === 'enum-string') {
    const enumJsonSchema = jsonSchema as JsonSchemaExtended & { enumObject: Record<any, any>; default: string }
    return StringEnum(enumJsonSchema.enumObject, enumJsonSchema.default)
  }

  throw new Error(`${jsonSchema.serializationType} is not supported as reverse schema generation.`)
}
