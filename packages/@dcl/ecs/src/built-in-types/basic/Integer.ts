import { ByteBuffer } from '../../serialization/ByteBuffer'
import { EcsType } from '../EcsType'

/**
 * @public
 */
export const Int64: EcsType<number> = {
  serialize(value: number, builder: ByteBuffer): void {
    builder.writeInt64(BigInt(value))
  },
  deserialize(reader: ByteBuffer): number {
    return Number(reader.readInt64())
  }
}

/**
 * @public
 */
export const Int32: EcsType<number> = {
  serialize(value: number, builder: ByteBuffer): void {
    builder.writeInt32(value)
  },
  deserialize(reader: ByteBuffer): number {
    return reader.readInt32()
  }
}

/**
 * @public
 */
export const Int16: EcsType<number> = {
  serialize(value: number, builder: ByteBuffer): void {
    builder.writeInt16(value)
  },
  deserialize(reader: ByteBuffer): number {
    return reader.readInt16()
  }
}

/**
 * @public
 */
export const Int8: EcsType<number> = {
  serialize(value: number, builder: ByteBuffer): void {
    builder.writeInt8(value)
  },
  deserialize(reader: ByteBuffer): number {
    return reader.readInt8()
  }
}
