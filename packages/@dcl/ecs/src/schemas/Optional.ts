import { DeepReadonly } from '../engine/readonly'
import { ByteBuffer } from '../serialization/ByteBuffer'
import { ISchema } from './ISchema'

/**
 * @internal
 */
export const IOptional = <T>(spec: ISchema<T>): ISchema<T | undefined> => {
  return {
    serialize(value: DeepReadonly<T> | undefined, builder: ByteBuffer): void {
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
    },
    create() {
      return undefined
    },
    jsonSchema: {
      type: spec.jsonSchema.type,
      serializationType: 'optional',
      optionalJsonSchema: spec.jsonSchema
    }
  }
}
