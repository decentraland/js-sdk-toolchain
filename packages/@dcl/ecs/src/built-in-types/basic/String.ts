import { ByteBuffer } from '../../serialization/ByteBuffer'
import { EcsType } from '../EcsType'

/**
 * @public
 */
export const FlatString: EcsType<string> = {
  serialize(value: string, builder: ByteBuffer): void {
    builder.writeBuffer(new TextEncoder().encode(value))
  },
  deserialize(reader: ByteBuffer): string {
    return new TextDecoder().decode(reader.readBuffer())
  }
}

/**
 * @public
 */
export const String = FlatString
