import { Entity } from '../../engine/entity'
import { ByteBuffer } from '../../serialization/ByteBuffer'
import { ISchema } from '../ISchema'

/**
 * @public
 */
export const EntitySchema: ISchema<Entity> = {
  serialize(value: Entity, builder: ByteBuffer): void {
    builder.writeInt32(value)
  },
  deserialize(reader: ByteBuffer): Entity {
    return reader.readInt32() as Entity
  },
  create() {
    return 0 as Entity
  }
}
