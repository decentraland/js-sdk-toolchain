import { DeepReadonly } from '../engine/readonly'
import { ByteBuffer } from '../serialization/ByteBuffer'

/**
 * @public
 */
export interface ISchema<T = any> {
  serialize(value: DeepReadonly<T>, builder: ByteBuffer): void
  deserialize(reader: ByteBuffer): T
  create(): T
  extend?: (base: Partial<DeepReadonly<T>> | undefined) => T
}
