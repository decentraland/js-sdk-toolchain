import { Entity } from '../engine'
import { IArray } from './Array'
import { Bool } from './basic/Boolean'
import { IntEnum as IntEnumSchema, StringEnum as StringEnumSchema } from './basic/Enum'
import { Float32, Float64 } from './basic/Float'
import { Int16, Int32, Int8, Int64 as iInt64 } from './basic/Integer'
import { EcsString } from './basic/String'
import { Color3Schema, Color3Type } from './custom/Color3'
import { Color4Schema, Color4Type } from './custom/Color4'
import { EntitySchema } from './custom/Entity'
import { QuaternionSchema, QuaternionType } from './custom/Quaternion'
import { Vector3Schema, Vector3Type } from './custom/Vector3'
import { ISchema, JsonSchemaExtended, JsonArray, JsonMap, JsonPrimitive } from './ISchema'
import { IMap } from './Map'
import { IOptional } from './Optional'
import { IOneOf } from './OneOf'
import { jsonSchemaToSchema, mutateValues } from './buildSchema'

export {
  QuaternionType,
  Vector3Type,
  ISchema,
  Color3Type,
  Color4Type,
  JsonSchemaExtended,
  JsonArray,
  JsonMap,
  JsonPrimitive
}
/**
 * @public
 */
export namespace Schemas {
  /** @public */
  export type SchemaType = ISchema

  /** @public */
  export const Boolean = Bool

  /** @public */
  export const String = EcsString

  /** @public */
  export const Float = Float32
  /** @public */
  export const Double = Float64

  /** @public */
  export const Byte = Int8
  /** @public */
  export const Short = Int16
  /** @public */
  export const Int = Int32
  /** @public */
  export const Int64 = iInt64

  /** @public */
  export const Number = Float32

  /** @public */
  export const Vector3: ISchema<Vector3Type> = Vector3Schema
  /** @public */
  export const Quaternion: ISchema<QuaternionType> = QuaternionSchema
  /** @public */
  export const Color3: ISchema<Color3Type> = Color3Schema
  /** @public */
  export const Color4: ISchema<Color4Type> = Color4Schema

  /** @public */
  export const Entity: ISchema<Entity> = EntitySchema

  /** @public */
  export const EnumNumber = IntEnumSchema
  /** @public */
  export const EnumString = StringEnumSchema
  /** @public */
  export const Array = IArray
  /** @public */
  export const Map = IMap
  /** @public */
  export const Optional = IOptional
  /** @public */
  export const OneOf = IOneOf

  /**
   * @public Create an ISchema object from the json-schema
   * @param jsonSchema
   * @returns a ISchema or fail for unsupported json-schema
   */
  export const fromJson: (json: JsonSchemaExtended) => ISchema<unknown> = jsonSchemaToSchema

  /**
   * @public
   *
   * Traverses and mutates values in a JSON schema-based structure, applying the given mutation function to each value.
   * The function is designed to work with nested maps and arrays, recursively processing each element.
   *
   * @param jsonSchema - The JSON schema object that describes the structure of the value.
   *                   It must have a serializationType of 'map', 'array', or other custom types like 'entity'.
   * @param value - The value to be mutated, which should conform to the provided JSON schema.
   * @param mutateFn - A function that takes a value and its corresponding valueType (JsonSchemaExtended) as arguments
   *                   and returns a tuple [boolean, any]. The boolean indicates whether the mutation should be applied,
   *                   and the second element is the mutated value.
   */
  export const mutateNestedValues: (
    jsonSchema: JsonSchemaExtended,
    value: unknown,
    mutateFn: (value: unknown, valueType: JsonSchemaExtended) => { changed: boolean; value?: any }
  ) => void = mutateValues
}
