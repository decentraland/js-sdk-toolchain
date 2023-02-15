import { ByteBuffer } from '../../serialization/ByteBuffer'
import { ISchema } from '../ISchema'

/**
 * @public
 */
export type QuaternionType = { x: number; y: number; z: number; w: number }

/**
 * @internal
 */
export const QuaternionSchema: ISchema<QuaternionType> = {
  serialize(value: QuaternionType, builder: ByteBuffer): void {
    builder.writeFloat32(value.x)
    builder.writeFloat32(value.y)
    builder.writeFloat32(value.z)
    builder.writeFloat32(value.w)
  },
  deserialize(reader: ByteBuffer): QuaternionType {
    return {
      x: reader.readFloat32(),
      y: reader.readFloat32(),
      z: reader.readFloat32(),
      w: reader.readFloat32()
    }
  },
  create() {
    return { x: 0, y: 0, z: 0, w: 0 }
  },
  jsonSchema: {
    type: 'object',
    properties: {
      x: { type: 'number' },
      y: { type: 'number' },
      z: { type: 'number' },
      w: { type: 'number' }
    },
    serializationType: 'quaternion'
  }
}
