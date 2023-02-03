import { ByteBuffer } from '../../serialization/ByteBuffer'
import { ISchema } from '../ISchema'

/**
 * @internal
 */
export const FlatString: ISchema<string> = {
  serialize(value: string, builder: ByteBuffer): void {
    builder.writeUtf8String(value)
  },
  deserialize(reader: ByteBuffer): string {
    return reader.readUtf8String()
  },
  create() {
    return ''
  }
}

/**
 * @internal
 */
export const EcsString = FlatString
