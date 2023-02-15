import { ByteBuffer } from '../../serialization/ByteBuffer'
import { ISchema } from '../ISchema'

/**
 * @public
 */
export type Color3Type = { r: number; g: number; b: number }

/**
 * @internal
 */
export const Color3Schema: ISchema<Color3Type> = {
  serialize(value: Color3Type, builder: ByteBuffer): void {
    builder.writeFloat32(value.r)
    builder.writeFloat32(value.g)
    builder.writeFloat32(value.b)
  },
  deserialize(reader: ByteBuffer): Color3Type {
    return {
      r: reader.readFloat32(),
      g: reader.readFloat32(),
      b: reader.readFloat32()
    }
  },
  create() {
    return { r: 0, g: 0, b: 0 }
  },
  jsonSchema: {
    type: 'object',
    properties: {
      r: { type: 'number' },
      g: { type: 'number' },
      b: { type: 'number' }
    },
    serializationType: 'color3'
  }
}
