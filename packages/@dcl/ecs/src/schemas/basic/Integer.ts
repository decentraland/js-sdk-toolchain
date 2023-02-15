import { ByteBuffer } from '../../serialization/ByteBuffer'
import { ISchema } from '../ISchema'

/**
 * @internal
 */
export const Int64: ISchema<number> = {
  serialize(value: number, builder: ByteBuffer): void {
    builder.writeInt64(BigInt(value))
  },
  deserialize(reader: ByteBuffer): number {
    return Number(reader.readInt64())
  },
  create() {
    return 0
  },
  jsonSchema: {
    type: 'integer',
    serializationType: 'int64'
  }
}

/**
 * @internal
 */
export const Int32: ISchema<number> = {
  serialize(value: number, builder: ByteBuffer): void {
    builder.writeInt32(value)
  },
  deserialize(reader: ByteBuffer): number {
    return reader.readInt32()
  },
  create() {
    return 0
  },
  jsonSchema: {
    type: 'integer',
    serializationType: 'int32'
  }
}

/**
 * @public
 */
export const Int16: ISchema<number> = {
  serialize(value: number, builder: ByteBuffer): void {
    builder.writeInt16(value)
  },
  deserialize(reader: ByteBuffer): number {
    return reader.readInt16()
  },
  create() {
    return 0
  },
  jsonSchema: {
    type: 'integer',
    serializationType: 'int16'
  }
}

/**
 * @public
 */
export const Int8: ISchema<number> = {
  serialize(value: number, builder: ByteBuffer): void {
    builder.writeInt8(value)
  },
  deserialize(reader: ByteBuffer): number {
    return reader.readInt8()
  },
  create() {
    return 0
  },
  jsonSchema: {
    type: 'integer',
    serializationType: 'int8'
  }
}
