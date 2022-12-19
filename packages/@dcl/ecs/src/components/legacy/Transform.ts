import { ComponentDefinition, IEngine } from '../../engine'
import { Entity } from '../../engine/entity'
import type { ISchema } from '../../schemas/ISchema'
import { ByteBuffer } from '../../serialization/ByteBuffer'

/**
 * @public
 */
export type TransformComponent = ComponentDefinition<TransformType>

/**
 * @public
 */
export interface TransformComponentExtended extends TransformComponent {
  create(entity: Entity, val?: TransformTypeWithOptionals): TransformType
  createOrReplace(
    entity: Entity,
    val?: TransformTypeWithOptionals
  ): TransformType
}

/**
 * @internal
 */
export const COMPONENT_ID = 1

/**
 * @public
 */
export type TransformType = {
  position: { x: number; y: number; z: number }
  rotation: { x: number; y: number; z: number; w: number }
  scale: { x: number; y: number; z: number }
  parent?: Entity
}

/** @internal */
export const TRANSFORM_LENGTH = 44

/** @internal */
export const TransformSchema: ISchema<TransformType> = {
  serialize(value: TransformType, builder: ByteBuffer): void {
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
    builder.setUint32(ptr + 40, (value.parent as number) || 0)
  },
  deserialize(reader: ByteBuffer): TransformType {
    const ptr = reader.incrementReadOffset(TRANSFORM_LENGTH)
    return {
      position: {
        x: reader.getFloat32(ptr),
        y: reader.getFloat32(ptr + 4),
        z: reader.getFloat32(ptr + 8)
      },
      rotation: {
        x: reader.getFloat32(ptr + 12),
        y: reader.getFloat32(ptr + 16),
        z: reader.getFloat32(ptr + 20),
        w: reader.getFloat32(ptr + 24)
      },
      scale: {
        x: reader.getFloat32(ptr + 28),
        y: reader.getFloat32(ptr + 32),
        z: reader.getFloat32(ptr + 36)
      },
      parent: reader.getUint32(ptr + 40) as Entity
    }
  },
  create(): TransformType {
    return {
      position: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      rotation: { x: 0, y: 0, z: 0, w: 1 }
    }
  },
  extend(value?: TransformType) {
    return {
      position: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      ...value
    }
  }
}

/**
 * @public
 */
export type TransformTypeWithOptionals = {
  position?: { x: number; y: number; z: number }
  rotation?: { x: number; y: number; z: number; w: number }
  scale?: { x: number; y: number; z: number }
  parent?: Entity
}

export function defineTransformComponent(
  engine: Pick<IEngine, 'defineComponentFromSchema'>
): ComponentDefinition<TransformType> {
  const transformDef = engine.defineComponentFromSchema(
    TransformSchema,
    COMPONENT_ID
  )
  return {
    ...transformDef,
    create(entity: Entity, val?: TransformTypeWithOptionals) {
      return transformDef.create(entity, val as TransformType)
    },
    createOrReplace(entity: Entity, val?: TransformTypeWithOptionals) {
      return transformDef.createOrReplace(entity, val as TransformType)
    }
  }
}
