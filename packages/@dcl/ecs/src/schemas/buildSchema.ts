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
import { IOneOf } from './OneOf'
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

  if (jsonSchema.serializationType === 'one-of') {
    const oneOfJsonSchema = jsonSchema as JsonSchemaExtended & { properties: Record<string, JsonSchemaExtended> }
    const spec: Record<string, ISchema> = {}
    for (const key in oneOfJsonSchema.properties) {
      spec[key] = jsonSchemaToSchema(oneOfJsonSchema.properties[key])
    }
    return IOneOf(spec)
  }

  throw new Error(`${jsonSchema.serializationType} is not supported as reverse schema generation.`)
}

const isOneOfJsonSchema = (
  type: JsonSchemaExtended
): type is JsonSchemaExtended & { properties: Record<string, JsonSchemaExtended> } =>
  type.serializationType === 'one-of'

const getTypeAndValue = (
  properties: Record<string, JsonSchemaExtended>,
  value: Record<string, unknown>,
  key: string
) => ({ type: properties[key], value: value[key] })

export function mutateValues(
  jsonSchema: JsonSchemaExtended,
  value: unknown,
  mutateFn: (value: unknown, valueType: JsonSchemaExtended) => { changed: boolean; value?: any }
): void {
  if (jsonSchema.serializationType === 'map') {
    const { properties } = jsonSchema as JsonSchemaExtended & { properties: Record<string, JsonSchemaExtended> }
    const typedValue = value as Record<string, unknown>

    for (const key in properties) {
      const { type, value: mapValue } = getTypeAndValue(properties, typedValue, key)

      if (type.serializationType === 'array' || type.serializationType === 'map') {
        mutateValues(type, mapValue, mutateFn)
      } else if (isOneOfJsonSchema(type)) {
        const typedMapValue = mapValue as ReturnType<ReturnType<typeof IOneOf>['deserialize']>
        const propType = type.properties[typedMapValue.$case]

        if (!typedMapValue.$case) continue

        // console.log(propType, typedMapValue, typedValue)

        if (propType.serializationType === 'array' || propType.serializationType === 'map') {
          typedValue[key] = { [typedMapValue.$case]: typedMapValue.value }
          mutateValues(propType, typedMapValue.value, mutateFn)
        } else {
          const newValue = mutateFn(typedMapValue.value, propType)
          if (newValue.changed) {
            typedValue[key] = newValue.value
          }
        }
      } else {
        const newValue = mutateFn(mapValue, type)
        if (newValue.changed) {
          typedValue[key] = newValue.value
        }
      }
    }
  } else if (jsonSchema.serializationType === 'array') {
    const withItemsJsonSchema = jsonSchema as JsonSchemaExtended & { items: JsonSchemaExtended }
    const arrayValue = value as unknown[]
    const nestedMutateValues =
      withItemsJsonSchema.items.serializationType === 'array' || withItemsJsonSchema.items.serializationType === 'map'

    for (let i = 0, n = arrayValue.length; i < n; i++) {
      if (nestedMutateValues) {
        mutateValues(withItemsJsonSchema.items, arrayValue[i], mutateFn)
      } else {
        const newValue = mutateFn(arrayValue[i], withItemsJsonSchema.items)
        if (newValue.changed) {
          arrayValue[i] = newValue.value
        }
      }
    }
  }
}
