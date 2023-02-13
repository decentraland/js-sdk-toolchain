import { ByteBuffer } from '../serialization/ByteBuffer'
import { ISchema } from './ISchema'

/**
 * @internal
 */
export const ArrayReflectionType = 'schemas::v1::array'

/**
 * @internal
 */
export const IArray = <T>(type: ISchema<T>): ISchema<Array<T>> => {
  return {
    serialize(value: Array<T>, builder: ByteBuffer): void {
      builder.writeUint32(value.length)
      for (const item of value) {
        type.serialize(item, builder)
      }
    },
    deserialize(reader: ByteBuffer): Array<T> {
      const newArray: Array<T> = []
      const length = reader.readUint32()
      for (let index = 0; index < length; index++) {
        newArray.push(type.deserialize(reader))
      }
      return newArray
    },
    create() {
      return []
    },
    description: {
      type: ArrayReflectionType,
      spec: type.description
    }
  }
}
