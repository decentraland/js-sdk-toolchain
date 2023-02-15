import { DeepReadonly } from '../../engine/readonly'
import { ByteBuffer } from '../../serialization/ByteBuffer'
import { ISchema } from '../ISchema'
import { Int32 } from './Integer'
import { FlatString } from './String'

/**
 * Validates the enum to ensure all member values are numbers and within the range of Int32.
 * @param enumValue The enum to be checked.
 * @throws If any member value is not a number or is outside the range of Int32.
 */
function validateMemberValuesAreNumbersAndInRangeInt32(enumValue: Record<any, any>) {
  const MIN_VALUE = -(2 ** 31),
    MAX_VALUE = 2 ** 31 - 1
  let valueCount = 0,
    totalCount = 0
  for (const key in enumValue) {
    if (typeof enumValue[key] === 'number') {
      if (enumValue[key] > MAX_VALUE || enumValue[key] < MIN_VALUE) {
        throw new Error(`Enum member values must be numbers within the range of ${MIN_VALUE} to ${MAX_VALUE}.`)
      }
      valueCount++
    }
    totalCount++
  }

  if (totalCount !== valueCount * 2) {
    throw new Error('All enum member values must be of numeric type.')
  }
}
/**
 * Validates the enum to ensure all member values are of string type.
 * @param enumValue The enum to be checked.
 * @throws If any member value is not of string type.
 */
function validateMemberValuesAreStrings(enumValue: Record<any, any>) {
  for (const key in enumValue) {
    if (typeof enumValue[key] !== 'string') {
      throw new Error('All enum member values must be of string type.')
    }
  }
}

/**
 * @internal
 */
export const IntEnumReflectionType = 'schemas::v1::enum-int'

/**
 * @internal
 */
export const IntEnum = <T>(enumObject: Record<any, any>, defaultValue: T): ISchema<T> => {
  validateMemberValuesAreNumbersAndInRangeInt32(enumObject)

  return {
    serialize(value: DeepReadonly<T>, builder: ByteBuffer): void {
      Int32.serialize(value as number, builder)
    },
    deserialize(reader: ByteBuffer): T {
      return Int32.deserialize(reader) as T
    },
    create() {
      return defaultValue
    },
    description: {
      type: IntEnumReflectionType,
      enumObject,
      defaultValue: defaultValue as any
    }
  }
}

/**
 * @internal
 */
export const StringEnumReflectionType = 'schemas::v1::enum-string'

/**
 * @internal
 */
export const StringEnum = <T>(enumObject: Record<any, any>, defaultValue: T): ISchema<T> => {
  validateMemberValuesAreStrings(enumObject)

  return {
    serialize(value: DeepReadonly<T>, builder: ByteBuffer): void {
      FlatString.serialize(value as string, builder)
    },
    deserialize(reader: ByteBuffer): T {
      return FlatString.deserialize(reader) as T
    },
    create() {
      return defaultValue
    },
    description: {
      type: StringEnumReflectionType,
      enumObject,
      defaultValue: defaultValue as any
    }
  }
}
