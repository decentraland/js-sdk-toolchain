import { ByteBuffer } from '../../serialization/ByteBuffer'
import { ISchema } from '../ISchema'

/**
 * @public
 */
export type Vector3Type = { x: number; y: number; z: number }

/**
 * @internal
 */
export const Vector3Schema: ISchema<Vector3Type> = {
  serialize(value: Vector3Type, builder: ByteBuffer): void {
    builder.writeFloat32(value.x)
    builder.writeFloat32(value.y)
    builder.writeFloat32(value.z)
  },
  deserialize(reader: ByteBuffer): Vector3Type {
    return {
      x: reader.readFloat32(),
      y: reader.readFloat32(),
      z: reader.readFloat32()
    }
  },
  create() {
    return { x: 0, y: 0, z: 0 }
  },
  jsonSchema: {
    type: 'object',
    properties: {
      x: { type: 'number' },
      y: { type: 'number' },
      z: { type: 'number' },
      w: { type: 'number' }
    },
    serializationType: 'vector3'
  }
}
