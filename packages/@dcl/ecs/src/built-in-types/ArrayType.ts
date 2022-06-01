import { ByteBuffer } from '../serialization/ByteBuffer'
import { EcsType } from './EcsType'

/**
 * @public
 */
export function ArrayType<T>(type: EcsType<T>): EcsType<Array<T>> {
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
    }
  }
}
