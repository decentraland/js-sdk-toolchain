import { IArray } from './Array'
import { Bool } from './basic/Boolean'
import { IEnum } from './basic/Enum'
import { Float32, Float64 } from './basic/Float'
import { Int16, Int32, Int8, Int64 as iInt64 } from './basic/Integer'
import { EcsString } from './basic/String'
import { ISchema as SchemaType } from './ISchema'
import { IMap } from './Map'
import { IOptional } from './Optional'

export namespace Schemas {
  export type ISchema = SchemaType

  export const Boolean = Bool

  export const String = EcsString

  export const Float = Float32
  export const Double = Float64

  export const Byte = Int8
  export const Short = Int16
  export const Int = Int32
  export const Int64 = iInt64

  export const Number = Float32

  export const Enum = IEnum
  export const Array = IArray
  export const Map = IMap
  export const Optional = IOptional
}
