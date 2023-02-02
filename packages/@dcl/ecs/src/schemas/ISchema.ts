import { ByteBuffer } from '../serialization/ByteBuffer'

/**
 * @public
 */
export interface ISchema<T = any> {
  serialize(value: T, builder: ByteBuffer): void
  deserialize(reader: ByteBuffer): T
  create(): T
  extend?: (base?: T) => T
}
