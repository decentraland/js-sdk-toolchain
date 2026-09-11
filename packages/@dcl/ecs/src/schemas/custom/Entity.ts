import { Entity } from '../../engine/entity'
import { ByteBuffer } from '../../serialization/ByteBuffer'
import { ISchema } from '../ISchema'

/**
 * @internal
 */
export const EntitySchema: ISchema<Entity> = {
  // Entity ids are uint32: the number and its version are packed into the top
  // and bottom halves, so anything past version 0x7fff has the high bit set.
  // Reading those back as signed produced a negative id that matched nothing.
  // The bytes are the same either way, so stored and in-flight data still reads.
  serialize(value: Entity, builder: ByteBuffer): void {
    builder.writeUint32(value as number)
  },
  deserialize(reader: ByteBuffer): Entity {
    return reader.readUint32() as Entity
  },
  create() {
    return 0 as Entity
  },
  jsonSchema: {
    type: 'integer',
    serializationType: 'entity'
  }
}
