import { JsonSchemaExtended } from '../ISchema'
import { IOneOf } from '../OneOf'
import { UnknownSchema } from './types'

export const isSchemaType = (value: JsonSchemaExtended, types: JsonSchemaExtended['serializationType'][]) =>
  types.includes(value.serializationType)

export const isOneOfJsonSchema = (
  type: JsonSchemaExtended
): type is JsonSchemaExtended & { properties: Record<string, JsonSchemaExtended> } => isSchemaType(type, ['one-of'])

export const getUnknownSchema = (): UnknownSchema => ({
  type: { type: 'object', serializationType: 'unknown' },
  value: undefined
})

export const isCompoundType = (type: JsonSchemaExtended): boolean => isSchemaType(type, ['array', 'map'])

export const getTypeAndValue = (
  properties: Record<string, JsonSchemaExtended>,
  value: Record<string, unknown>,
  key: string
): UnknownSchema => {
  const type = properties[key]
  const valueKey = value[key]

  if (isOneOfJsonSchema(type)) {
    const typedMapValue = valueKey as ReturnType<ReturnType<typeof IOneOf>['deserialize']>
    if (!typedMapValue.$case) return getUnknownSchema()

    const propType = type.properties[typedMapValue.$case]

    // transform { $case: string; value: unknown } => { [$case]: value }
    if (isCompoundType(propType)) value[key] = { [typedMapValue.$case]: typedMapValue.value }

    return { type: propType, value: typedMapValue.value }
  }

  return { type, value: valueKey }
}
