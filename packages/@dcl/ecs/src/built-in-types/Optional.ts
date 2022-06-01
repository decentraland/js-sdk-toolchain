import { ByteBuffer } from '../serialization/ByteBuffer'
import { EcsType } from './EcsType'

/**
 * @public
 */
export function Optional<T>(spec: EcsType<T>): EcsType<T | undefined> {
  return {
    serialize(value: T | undefined, builder: ByteBuffer): void {
      if (value) {
        builder.writeInt8(1)
        spec.serialize(value, builder)
      } else {
        builder.writeInt8(0)
      }
    },
    deserialize(reader: ByteBuffer): T | undefined {
      const exists = reader.readInt8()
      if (exists) {
        return spec.deserialize(reader)
      }
    }
  }
}
