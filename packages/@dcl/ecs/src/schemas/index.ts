import { Entity } from '../engine'
import { IArray } from './Array'
import { Bool } from './basic/Boolean'
import { IEnum } from './basic/Enum'
import { Float32, Float64 } from './basic/Float'
import { Int16, Int32, Int8, Int64 as iInt64 } from './basic/Integer'
import { EcsString } from './basic/String'
import { Color3Schema, Color3Type } from './custom/Color3'
import { Color4Schema, Color4Type } from './custom/Color4'
import { EntitySchema } from './custom/Entity'
import { QuaternionSchema, QuaternionType } from './custom/Quaternion'
import { Vector3Schema, Vector3Type } from './custom/Vector3'
import { ISchema } from './ISchema'
import { IMap } from './Map'
import { IOptional } from './Optional'

export { QuaternionType, Vector3Type, ISchema, Color3Type, Color4Type }
/**
 * @public
 */
export namespace Schemas {
  export type SchemaType = ISchema

  export const Boolean = Bool

  export const String = EcsString

  export const Float = Float32
  export const Double = Float64

  export const Byte = Int8
  export const Short = Int16
  export const Int = Int32
  export const Int64 = iInt64

  export const Number = Float32

  export const Vector3: ISchema<Vector3Type> = Vector3Schema
  export const Quaternion: ISchema<QuaternionType> = QuaternionSchema
  export const Color3: ISchema<Color3Type> = Color3Schema
  export const Color4: ISchema<Color4Type> = Color4Schema

  export const Entity: ISchema<Entity> = EntitySchema

  export const Enum = IEnum
  export const Array = IArray
  export const Map = IMap
  export const Optional = IOptional
}
