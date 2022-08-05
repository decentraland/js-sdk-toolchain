import { ByteBuffer } from '../../serialization/ByteBuffer'
import { ISchema } from '../ISchema'

/**
 * @public
 */
export const FlatString: ISchema<string> = {
  serialize(value: string, builder: ByteBuffer): void {
    builder.writeBuffer(new TextEncoder().encode(value))
  },
  deserialize(reader: ByteBuffer): string {
    return new TextDecoder().decode(reader.readBuffer())
  },
  create() {
    return ''
  }
}

/**
 * @public
 */
export const EcsString = FlatString
