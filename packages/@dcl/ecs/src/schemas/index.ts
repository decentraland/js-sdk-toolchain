import { IArray } from './Array'
import { Bool } from './basic/Boolean'
import { IEnum } from './basic/Enum'
import { Float32, Float64 } from './basic/Float'
import { Int16, Int32, Int8, Int64 as iInt64 } from './basic/Integer'
import { EcsString } from './basic/String'
import { Color3Schema } from './custom/Color3'
import { Color4Schema } from './custom/Color4'
import { QuaternionSchema } from './custom/Quaternion'
import { Vector3Schema } from './custom/Vector3'
import { ISchema } from './ISchema'
import { IMap } from './Map'
import { IOptional } from './Optional'

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

  export const Vector3 = Vector3Schema
  export const Quaternion = QuaternionSchema
  export const Color3 = Color3Schema
  export const Color4 = Color4Schema

  export const Enum = IEnum
  export const Array = IArray
  export const Map = IMap
  export const Optional = IOptional
}
