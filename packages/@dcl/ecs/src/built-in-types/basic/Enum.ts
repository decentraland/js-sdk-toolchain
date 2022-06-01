import { ByteBuffer } from '../../serialization/ByteBuffer'
import { EcsType } from '../EcsType'

/**
 * @public
 */
export function Enum<T>(type: EcsType<any>): EcsType<T> {
  return {
    serialize(value: T, builder: ByteBuffer): void {
      type.serialize(value, builder)
    },
    deserialize(reader: ByteBuffer): T {
      return type.deserialize(reader)
    }
  }
}
