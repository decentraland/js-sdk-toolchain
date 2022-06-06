import { Quaternion, Vector3 } from '../../Math'
import type { EcsType } from '../../built-in-types/EcsType'
import { Entity } from '../../engine/entity'
import { ByteBuffer } from '../../serialization/ByteBuffer'

/**
 * @public
 */
export type Transform = {
  position: Vector3.MutableVector3
  rotation: Quaternion.MutableQuaternion
  scale: Vector3.MutableVector3
  parent?: Entity
}

export const TRANSFORM_LENGTH = 44

// This transform can be optimized with Float32Array for example
export const Transform: EcsType<Transform> = {
  serialize(value: Transform, builder: ByteBuffer): void {
    const ptr = builder.incrementWriteOffset(TRANSFORM_LENGTH)
    builder.setFloat32(ptr, value.position.x)
    builder.setFloat32(ptr + 4, value.position.y)
    builder.setFloat32(ptr + 8, value.position.z)
    builder.setFloat32(ptr + 12, value.rotation.x)
    builder.setFloat32(ptr + 16, value.rotation.y)
    builder.setFloat32(ptr + 20, value.rotation.z)
    builder.setFloat32(ptr + 24, value.rotation.w)
    builder.setFloat32(ptr + 28, value.scale.x)
    builder.setFloat32(ptr + 32, value.scale.y)
    builder.setFloat32(ptr + 36, value.scale.z)
    builder.setUint32(ptr + 40, value.parent || 0)
  },
  deserialize(reader: ByteBuffer): Transform {
    const ptr = reader.incrementReadOffset(TRANSFORM_LENGTH)
    return {
      position: Vector3.create(
        reader.getFloat32(ptr),
        reader.getFloat32(ptr + 4),
        reader.getFloat32(ptr + 8)
      ),
      rotation: Quaternion.create(
        reader.getFloat32(ptr + 12),
        reader.getFloat32(ptr + 16),
        reader.getFloat32(ptr + 20),
        reader.getFloat32(ptr + 24)
      ),
      scale: Vector3.create(
        reader.getFloat32(ptr + 28),
        reader.getFloat32(ptr + 32),
        reader.getFloat32(ptr + 36)
      ),
      parent: reader.getUint32(ptr + 40) as Entity
    }
  }
}
