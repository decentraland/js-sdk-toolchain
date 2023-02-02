import { ByteBuffer } from '../../serialization/ByteBuffer'
import { ISchema } from '../ISchema'

/**
 * @internal
 */
export const IEnum = <T>(type: ISchema<any>): ISchema<T> => {
  return {
    serialize(value: T, builder: ByteBuffer): void {
      type.serialize(value, builder)
    },
    deserialize(reader: ByteBuffer): T {
      return type.deserialize(reader)
    },
    create() {
      return type.create()
    }
  }
}
