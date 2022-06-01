import { ByteBuffer } from '../../serialization/ByteBuffer'
import { EcsType } from '../EcsType'

/**
 * @public
 */
export const Boolean: EcsType<boolean> = {
  serialize(value: boolean, builder: ByteBuffer): void {
    builder.writeInt8(value ? 1 : 0)
  },
  deserialize(reader: ByteBuffer): boolean {
    return reader.readInt8() === 1
  }
}
