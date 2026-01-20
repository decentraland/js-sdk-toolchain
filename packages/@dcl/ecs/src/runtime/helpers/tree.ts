import * as components from '../../components'
import { Entity } from '../../engine/entity'
import { ComponentDefinition, IEngine } from '../../engine'
import { Vector3Type } from '../../schemas/custom/Vector3'
import { QuaternionType } from '../../schemas/custom/Quaternion'

/**
 * @internal
 * Add two Vector3 values
 */
function addVectors(v1: Vector3Type, v2: Vector3Type): Vector3Type {
  return {
    x: v1.x + v2.x,
    y: v1.y + v2.y,
    z: v1.z + v2.z
  }
}

/**
 * @internal
 * Multiply two Vector3 values element-wise (used for scaling)
 */
function multiplyVectors(v1: Vector3Type, v2: Vector3Type): Vector3Type {
  return {
    x: v1.x * v2.x,
    y: v1.y * v2.y,
    z: v1.z * v2.z
  }
}

/**
 * @internal
 * Multiply two quaternions (combines rotations)
 * Result represents applying q1 first, then q2
 */
function multiplyQuaternions(q1: QuaternionType, q2: QuaternionType): QuaternionType {
  return {
    x: q1.w * q2.x + q1.x * q2.w + q1.y * q2.z - q1.z * q2.y,
    y: q1.w * q2.y - q1.x * q2.z + q1.y * q2.w + q1.z * q2.x,
    z: q1.w * q2.z + q1.x * q2.y - q1.y * q2.x + q1.z * q2.w,
    w: q1.w * q2.w - q1.x * q2.x - q1.y * q2.y - q1.z * q2.z
  }
}

/**
 * @internal
 * Rotate a vector by a quaternion
 * Uses the formula: v' = q * v * q^(-1), optimized version
 */
function rotateVectorByQuaternion(v: Vector3Type, q: QuaternionType): Vector3Type {
  // Extract quaternion components
  const qx = q.x,
    qy = q.y,
    qz = q.z,
    qw = q.w

  // Calculate cross product terms (q.xyz × v) * 2
  const ix = qw * v.x + qy * v.z - qz * v.y
  const iy = qw * v.y + qz * v.x - qx * v.z
  const iz = qw * v.z + qx * v.y - qy * v.x
  const iw = -qx * v.x - qy * v.y - qz * v.z

  // Calculate final rotated vector
  return {
    x: ix * qw + iw * -qx + iy * -qz - iz * -qy,
    y: iy * qw + iw * -qy + iz * -qx - ix * -qz,
    z: iz * qw + iw * -qz + ix * -qy - iy * -qx
  }
}

/**
 * @internal
 * Combined world transform result for single-pass computation
 */
type WorldTransform = {
  position: Vector3Type
  rotation: QuaternionType
  scale: Vector3Type
}

/**
 * @internal
 * Computes world position, rotation, and scale in a single hierarchy traversal.
 * This is O(n) where n is the depth of the hierarchy.
 * @throws Error if a circular dependency is detected in the entity hierarchy
 */
function getWorldTransformInternal(
  Transform: ReturnType<typeof components.Transform>,
  entity: Entity,
  visited: Set<Entity> = new Set()
): WorldTransform {
  const transform = Transform.getOrNull(entity)

  if (!transform) {
    return {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1, y: 1, z: 1 }
    }
  }

  if (!transform.parent) {
    return {
      position: { ...transform.position },
      rotation: { ...transform.rotation },
      scale: { ...transform.scale }
    }
  }

  visited.add(entity)

  if (visited.has(transform.parent)) {
    throw new Error(
      `Circular dependency detected in entity hierarchy: entity ${entity} has ancestor ${transform.parent} which creates a cycle`
    )
  }

  // Single recursive call to get parent's full world transform
  const parentWorld = getWorldTransformInternal(Transform, transform.parent, visited)

  // Compute this entity's world transform
  const worldScale = multiplyVectors(parentWorld.scale, transform.scale)
  const worldRotation = multiplyQuaternions(parentWorld.rotation, transform.rotation)

  const scaledPosition = multiplyVectors(transform.position, parentWorld.scale)
  const rotatedPosition = rotateVectorByQuaternion(scaledPosition, parentWorld.rotation)
  const worldPosition = addVectors(parentWorld.position, rotatedPosition)

  return {
    position: worldPosition,
    rotation: worldRotation,
    scale: worldScale
  }
}

function* genEntityTree<T>(entity: Entity, entities: Map<Entity, T & { parent?: Entity }>): Generator<Entity> {
  // This avoid infinite loop when there is a cyclic parenting
  if (!entities.has(entity)) return
  entities.delete(entity)

  for (const [_entity, value] of entities) {
    if (value.parent === entity) {
      yield* genEntityTree(_entity, entities)
    }
  }

  yield entity
}

/**
 * Get an iterator of entities that follow a tree structure for a component
 * @public
 * @param engine - the engine running the entities
 * @param entity - the root entity of the tree
 * @param component - the parenting component to filter by
 * @returns An iterator of an array as [entity, entity2, ...]
 *
 * Example:
 * ```ts
 * const TreeComponent = engine.defineComponent('custom::TreeComponent', {
 *    label: Schemas.String,
 *    parent: Schemas.Entity
 * })
 *
 * for (const entity of getComponentEntityTree(engine, entity, TreeComponent)) {
 *    // entity in the tree
 * }
 * ```
 */
export function getComponentEntityTree<T>(
  engine: Pick<IEngine, 'getEntitiesWith'>,
  entity: Entity,
  component: ComponentDefinition<T & { parent?: Entity }>
): Generator<Entity> {
  const entities = new Map(engine.getEntitiesWith(component))
  return genEntityTree(entity, entities)
}

// I swear by all the gods that this is being tested on test/sdk/network/sync-engines.spec.ts
/* istanbul ignore next */
function removeNetworkEntityChildrens(
  engine: Pick<IEngine, 'getEntitiesWith' | 'defineComponentFromSchema' | 'removeEntity' | 'defineComponent'>,
  parent: Entity
): void {
  const NetworkParent = components.NetworkParent(engine)
  const NetworkEntity = components.NetworkEntity(engine)

  // Remove parent
  engine.removeEntity(parent)

  // Remove childs
  const network = NetworkEntity.getOrNull(parent)
  if (network) {
    for (const [entity, parent] of engine.getEntitiesWith(NetworkParent)) {
      if (parent.entityId === network.entityId && parent.networkId === network.networkId) {
        removeNetworkEntityChildrens(engine, entity)
      }
    }
  }
  return
}

/**
 * Remove all components of each entity in the tree made with Transform parenting
 * @param engine - the engine running the entities
 * @param firstEntity - the root entity of the tree
 * @public
 */
export function removeEntityWithChildren(
  engine: Pick<IEngine, 'getEntitiesWith' | 'defineComponentFromSchema' | 'removeEntity' | 'defineComponent'>,
  entity: Entity
) {
  const Transform = components.Transform(engine)
  const NetworkEntity = components.NetworkEntity(engine)

  /* istanbul ignore if */
  if (NetworkEntity.has(entity)) {
    return removeNetworkEntityChildrens(engine, entity)
  }

  for (const ent of getComponentEntityTree(engine, entity, Transform)) {
    engine.removeEntity(ent)
  }
}

/**
 * Get all entities that have the given entity as their parent
 * @public
 * @param engine - the engine running the entities
 * @param parent - the parent entity to find children for
 * @returns An array of entities that have the given parent
 *
 * Example:
 * ```ts
 * const children = getEntitiesWithParent(engine, myEntity)
 * for (const child of children) {
 *   // process each child entity
 * }
 * ```
 */
export function getEntitiesWithParent(
  engine: Pick<IEngine, 'getEntitiesWith' | 'defineComponentFromSchema'>,
  parent: Entity
): Entity[] {
  const Transform = components.Transform(engine)
  const entitiesWithParent: Entity[] = []

  for (const [entity, transform] of engine.getEntitiesWith(Transform)) {
    if (transform.parent === parent) {
      entitiesWithParent.push(entity)
    }
  }

  return entitiesWithParent
}

/**
 * Get the world position of an entity, taking into account the full parent hierarchy.
 * This computes the world-space position by accumulating all parent transforms
 * (position, rotation, and scale).
 *
 * @public
 * @param engine - the engine running the entities
 * @param entity - the entity to get the world position for
 * @returns The entity's position in world space. Returns `{x: 0, y: 0, z: 0}` if the entity has no Transform.
 *
 * Example:
 * ```ts
 * const worldPos = getWorldPosition(engine, childEntity)
 * console.log(`World position: ${worldPos.x}, ${worldPos.y}, ${worldPos.z}`)
 * ```
 */
export function getWorldPosition(
  engine: Pick<IEngine, 'getEntitiesWith' | 'defineComponentFromSchema'>,
  entity: Entity
): Vector3Type {
  const Transform = components.Transform(engine)
  return getWorldTransformInternal(Transform, entity).position
}

/**
 * Get the world rotation of an entity, taking into account the full parent hierarchy.
 * This computes the world-space rotation by combining all parent rotations.
 *
 * @public
 * @param engine - the engine running the entities
 * @param entity - the entity to get the world rotation for
 * @returns The entity's rotation in world space as a quaternion. Returns identity quaternion `{x: 0, y: 0, z: 0, w: 1}` if the entity has no Transform.
 *
 * Example:
 * ```ts
 * const worldRot = getWorldRotation(engine, childEntity)
 * console.log(`World rotation: ${worldRot.x}, ${worldRot.y}, ${worldRot.z}, ${worldRot.w}`)
 * ```
 */
export function getWorldRotation(
  engine: Pick<IEngine, 'getEntitiesWith' | 'defineComponentFromSchema'>,
  entity: Entity
): QuaternionType {
  const Transform = components.Transform(engine)
  return getWorldTransformInternal(Transform, entity).rotation
}
