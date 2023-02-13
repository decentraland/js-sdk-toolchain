import { ArrayReflectionType, IArray } from './Array'
import { Bool } from './basic/Boolean'
import { IntEnum, IntEnumReflectionType, StringEnum, StringEnumReflectionType } from './basic/Enum'
import { Float32, Float64 } from './basic/Float'
import { Int16, Int32, Int8, Int64 } from './basic/Integer'
import { EcsString } from './basic/String'
import { Color3Schema } from './custom/Color3'
import { Color4Schema } from './custom/Color4'
import { EntitySchema } from './custom/Entity'
import { QuaternionSchema } from './custom/Quaternion'
import { Vector3Schema } from './custom/Vector3'
import { ISchema, SchemaDescription } from './ISchema'
import { IMap, MapReflectionType } from './Map'
import { IOptional, OptionalReflectionType } from './Optional'

const primitiveSchemas = {
  [Bool.description.type]: Bool,
  [EcsString.description.type]: EcsString,
  [Float32.description.type]: Float32,
  [Float64.description.type]: Float64,
  [Int8.description.type]: Int8,
  [Int16.description.type]: Int16,
  [Int32.description.type]: Int32,
  [Int64.description.type]: Int64,
  [Vector3Schema.description.type]: Vector3Schema,
  [QuaternionSchema.description.type]: QuaternionSchema,
  [Color3Schema.description.type]: Color3Schema,
  [Color4Schema.description.type]: Color4Schema,
  [EntitySchema.description.type]: EntitySchema
}

const generationWithSpecSchemas: Record<string, (spec: ISchema<any>) => ISchema> = {
  [ArrayReflectionType]: IArray,
  [OptionalReflectionType]: IOptional
}

type GenerationWithSpecDescription = SchemaDescription & {
  spec: SchemaDescription
}

const enumSchemas: Record<string, (enumObject: Record<string, any>, defaultValue: any) => ISchema> = {
  [IntEnumReflectionType]: IntEnum,
  [StringEnumReflectionType]: StringEnum
}

type EnumSchemaDescriprtion = SchemaDescription & {
  enumObject: Record<any, any>
  defaultValue: any
}

type MapSchemaDescription = SchemaDescription & {
  spec: Record<string, SchemaDescription>
}

/**
 * Create an ISchema object from the schema description
 * @param description the SchemaDescription object
 * @returns a ISchema or fail for unsupported description
 */
export function schemaDescriptionToSchema(description: SchemaDescription): ISchema<any> {
  if (primitiveSchemas[description.type]) {
    return primitiveSchemas[description.type]
  }

  if (description.type === MapReflectionType) {
    const specDescription = description as MapSchemaDescription
    const spec: Record<string, ISchema> = {}
    for (const key in specDescription.spec) {
      spec[key] = schemaDescriptionToSchema(specDescription.spec[key])
    }
    return IMap(spec)
  }

  if (Object.keys(generationWithSpecSchemas).includes(description.type)) {
    const withSpecDescription = description as GenerationWithSpecDescription
    return generationWithSpecSchemas[description.type](schemaDescriptionToSchema(withSpecDescription.spec))
  }

  if (Object.keys(enumSchemas).includes(description.type)) {
    const enumDescription = description as EnumSchemaDescriprtion
    return enumSchemas[description.type](enumDescription.enumObject, enumDescription.defaultValue)
  }

  throw new Error(`${description.type} is not supported as reverse schema generation.`)
}
