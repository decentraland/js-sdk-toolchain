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

/** @internal Identity transform values */
const IDENTITY_POSITION: Vector3Type = { x: 0, y: 0, z: 0 }
const IDENTITY_ROTATION: QuaternionType = { x: 0, y: 0, z: 0, w: 1 }
const IDENTITY_SCALE: Vector3Type = { x: 1, y: 1, z: 1 }

/** @internal Transform with position and rotation only (used for player transforms) */
type PositionRotationTransform = { position: Vector3Type; rotation: QuaternionType }

/** @internal Full transform with position, rotation, and scale (used for entity transforms) */
type FullTransform = PositionRotationTransform & { scale: Vector3Type }

/**
 * @internal
 * Computes the world transform for an entity with AvatarAttach.
 * If the entity has a Transform, the avatar-relative values (set by the renderer)
 * are combined with the player's transform. Otherwise, returns the player's transform
 * with identity scale.
 */
function computeAvatarAttachedWorldTransform(
  playerTransform: PositionRotationTransform,
  entityTransform: FullTransform | null
): WorldTransform {
  if (!entityTransform) {
    return {
      position: { ...playerTransform.position },
      rotation: { ...playerTransform.rotation },
      scale: { ...IDENTITY_SCALE }
    }
  }

  const rotatedPosition = rotateVectorByQuaternion(entityTransform.position, playerTransform.rotation)

  return {
    position: addVectors(playerTransform.position, rotatedPosition),
    rotation: multiplyQuaternions(playerTransform.rotation, entityTransform.rotation),
    scale: entityTransform.scale
  }
}

/**
 * @internal
 * Finds the transform of a player by their avatar ID.
 * Returns the local player's transform if avatarId is undefined,
 * or searches for a remote player by matching their address.
 */
function findPlayerTransform(
  Transform: ReturnType<typeof components.Transform>,
  PlayerIdentityData: ReturnType<typeof components.PlayerIdentityData> | null,
  localPlayerEntity: Entity,
  avatarId: string | undefined
): PositionRotationTransform | null {
  // Local player (avatarId undefined)
  if (avatarId === undefined) {
    return Transform.getOrNull(localPlayerEntity)
  }

  // Remote player - find their entity by matching address
  if (!PlayerIdentityData) {
    return null
  }

  for (const [playerEntity, identityData] of PlayerIdentityData.iterator()) {
    if (identityData.address === avatarId) {
      return Transform.getOrNull(playerEntity)
    }
  }

  return null
}

/**
 * @internal
 * Computes world position, rotation, and scale in a single hierarchy traversal.
 * This is O(n) where n is the depth of the hierarchy.
 *
 * When an entity has AvatarAttach and Transform, the renderer updates the Transform
 * with avatar-relative values (including the exact anchor point offset). This function
 * combines the player's transform with the entity's avatar-relative transform to
 * compute the world-space position.
 *
 * @throws Error if a circular dependency is detected in the entity hierarchy
 */
function getWorldTransformInternal(
  Transform: ReturnType<typeof components.Transform>,
  AvatarAttach: ReturnType<typeof components.AvatarAttach> | null,
  PlayerIdentityData: ReturnType<typeof components.PlayerIdentityData> | null,
  PlayerEntity: Entity,
  entity: Entity,
  visited: Set<Entity> = new Set()
): WorldTransform {
  const transform = Transform.getOrNull(entity)
  const avatarAttach = AvatarAttach?.getOrNull(entity)

  // Handle AvatarAttach: combine player's transform with the entity's avatar-relative transform
  // (which the renderer updates with the exact anchor point offset for hand, head, etc.)
  if (avatarAttach) {
    const playerTransform = findPlayerTransform(Transform, PlayerIdentityData, PlayerEntity, avatarAttach.avatarId)
    if (playerTransform) {
      return computeAvatarAttachedWorldTransform(playerTransform, transform)
    }
    // Player's Transform not available, fall through to normal Transform handling
  }

  if (!transform) {
    return {
      position: { ...IDENTITY_POSITION },
      rotation: { ...IDENTITY_ROTATION },
      scale: { ...IDENTITY_SCALE }
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

  const parentWorld = getWorldTransformInternal(
    Transform,
    AvatarAttach,
    PlayerIdentityData,
    PlayerEntity,
    transform.parent,
    visited
  )

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

/** @public Engine type for world transform functions */
export type WorldTransformEngine = Pick<IEngine, 'getEntitiesWith' | 'defineComponentFromSchema' | 'PlayerEntity'>

/**
 * @internal
 * Computes the world transform for an entity using the provided engine.
 * This is a convenience wrapper that initializes the required components.
 */
function getWorldTransform(engine: WorldTransformEngine, entity: Entity): WorldTransform {
  const Transform = components.Transform(engine)
  const AvatarAttach = components.AvatarAttach(engine)
  const PlayerIdentityData = components.PlayerIdentityData(engine)
  return getWorldTransformInternal(Transform, AvatarAttach, PlayerIdentityData, engine.PlayerEntity, entity)
}

/**
 * Get the world position of an entity, taking into account the full parent hierarchy.
 * This computes the world-space position by accumulating all parent transforms
 * (position, rotation, and scale).
 *
 * When the entity has AvatarAttach and Transform, the renderer updates the Transform
 * with avatar-relative values (including the exact anchor point offset for hand, head, etc.).
 * This function combines the player's transform with those values to compute the world position.
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
export function getWorldPosition(engine: WorldTransformEngine, entity: Entity): Vector3Type {
  return getWorldTransform(engine, entity).position
}

/**
 * Get the world rotation of an entity, taking into account the full parent hierarchy.
 * This computes the world-space rotation by combining all parent rotations.
 *
 * When the entity has AvatarAttach and Transform, the renderer updates the Transform
 * with avatar-relative values (including the exact anchor point rotation for hand, head, etc.).
 * This function combines the player's rotation with those values to compute the world rotation.
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
export function getWorldRotation(engine: WorldTransformEngine, entity: Entity): QuaternionType {
  return getWorldTransform(engine, entity).rotation
}
