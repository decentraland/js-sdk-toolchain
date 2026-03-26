import { LastWriteWinElementSetComponentDefinition, IEngine } from '../../engine'
import { Entity } from '../../engine/entity'
import type { ISchema } from '../../schemas/ISchema'
import type { Vector3Type } from '../../schemas/custom/Vector3'
import { ByteBuffer } from '../../serialization/ByteBuffer'
// Use import * to safely handle circular dependency (tree.ts → components → Transform.ts → tree.ts).
// With import *, the namespace object's properties are resolved at access time (live bindings in ESM,
// getters via __importStar in CJS), so by the time methods are called all exports are available.
import * as treeHelpers from '../../runtime/helpers/tree'

/**
 * @public
 */
export type TransformComponent = LastWriteWinElementSetComponentDefinition<TransformType>

/**
 * @public
 */
export interface TransformComponentExtended extends TransformComponent {
  create(entity: Entity, val?: TransformTypeWithOptionals): TransformType
  createOrReplace(entity: Entity, val?: TransformTypeWithOptionals): TransformType

  /**
   * Transforms a direction vector from an entity's local coordinate space
   * to world space, accounting for the full parent hierarchy.
   *
   * This applies only rotation (not translation or scale) — suitable for
   * direction vectors like force/impulse directions.
   *
   * @param entity - The source entity whose local space defines the direction
   * @param localDirection - Direction vector in the entity's local coordinates
   * @returns The direction vector in world coordinates
   */
  localToWorldDirection(entity: Entity, localDirection: Vector3Type): Vector3Type
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
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      parent: 0 as Entity
    }
  },
  extend(value?: Partial<TransformType>) {
    return {
      position: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      parent: 0 as Entity,
      ...value
    }
  },
  jsonSchema: {
    type: 'object',
    properties: {
      position: {
        type: 'object',
        properties: {
          x: { type: 'number' },
          y: { type: 'number' },
          z: { type: 'number' }
        }
      },
      scale: {
        type: 'object',
        properties: {
          x: { type: 'number' },
          y: { type: 'number' },
          z: { type: 'number' }
        }
      },
      rotation: {
        type: 'object',
        properties: {
          x: { type: 'number' },
          y: { type: 'number' },
          z: { type: 'number' },
          w: { type: 'number' }
        }
      },
      parent: { type: 'integer' }
    },
    serializationType: 'transform'
  }
}

/**
 * @public
 */
export type TransformTypeWithOptionals = Partial<TransformType>

export function defineTransformComponent(
  engine: Pick<IEngine, 'defineComponentFromSchema'>
): TransformComponentExtended {
  const transformDef = engine.defineComponentFromSchema('core::Transform', TransformSchema)

  return {
    ...transformDef,
    create(entity: Entity, val?: TransformTypeWithOptionals) {
      return transformDef.create(entity, TransformSchema.extend!(val))
    },
    createOrReplace(entity: Entity, val?: TransformTypeWithOptionals) {
      return transformDef.createOrReplace(entity, TransformSchema.extend!(val))
    },
    localToWorldDirection(entity: Entity, localDirection: Vector3Type): Vector3Type {
      const worldRotation = treeHelpers.getWorldRotation(engine as treeHelpers.WorldTransformEngine, entity)
      return treeHelpers.rotateVectorByQuaternion(localDirection, worldRotation)
    }
  }
}
