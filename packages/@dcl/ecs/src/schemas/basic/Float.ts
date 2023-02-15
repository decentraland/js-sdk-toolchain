import { ByteBuffer } from '../../serialization/ByteBuffer'
import { ISchema } from '../ISchema'

/**
 * @internal
 */
export const Float32: ISchema<number> = {
  serialize(value: number, builder: ByteBuffer): void {
    builder.writeFloat32(value)
  },
  deserialize(reader: ByteBuffer): number {
    return reader.readFloat32()
  },
  create() {
    return 0.0
  },
  jsonSchema: {
    type: 'number',
    serializationType: 'float32'
  }
}

/**
 * @internal
 */
export const Float64: ISchema<number> = {
  serialize(value: number, builder: ByteBuffer): void {
    builder.writeFloat64(value)
  },
  deserialize(reader: ByteBuffer): number {
    return reader.readFloat64()
  },
  create() {
    return 0.0
  },
  jsonSchema: {
    type: 'number',
    serializationType: 'float64'
  }
}
