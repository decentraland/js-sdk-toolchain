import { ByteBuffer } from '../../serialization/ByteBuffer'
import { ISchema } from '../ISchema'

/**
 * @public
 */
export type Color4Type = { r: number; g: number; b: number; a: number }

/**
 * @internal
 */
export const Color4Schema: ISchema<Color4Type> = {
  serialize(value: Color4Type, builder: ByteBuffer): void {
    builder.writeFloat32(value.r)
    builder.writeFloat32(value.g)
    builder.writeFloat32(value.b)
    builder.writeFloat32(value.a)
  },
  deserialize(reader: ByteBuffer): Color4Type {
    return {
      r: reader.readFloat32(),
      g: reader.readFloat32(),
      b: reader.readFloat32(),
      a: reader.readFloat32()
    }
  },
  create() {
    return { r: 0, g: 0, b: 0, a: 0 }
  },
  jsonSchema: {
    type: 'object',
    properties: {
      r: { type: 'number' },
      g: { type: 'number' },
      b: { type: 'number' },
      a: { type: 'number' }
    },
    serializationType: 'color4'
  }
}
