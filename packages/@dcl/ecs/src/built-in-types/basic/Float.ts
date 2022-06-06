import { ByteBuffer } from '../../serialization/ByteBuffer'
import { EcsType } from '../EcsType'

/**
 * @public
 */
export const Float32: EcsType<number> = {
  serialize(value: number, builder: ByteBuffer): void {
    builder.writeFloat32(value)
  },
  deserialize(reader: ByteBuffer): number {
    return reader.readFloat32()
  }
}

/**
 * @public
 */
export const Float64: EcsType<number> = {
  serialize(value: number, builder: ByteBuffer): void {
    builder.writeFloat64(value)
  },
  deserialize(reader: ByteBuffer): number {
    return reader.readFloat64()
  }
}
