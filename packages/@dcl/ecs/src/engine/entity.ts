import { createVersionGSet } from '../systems/crdt/gset'

/** @internal Optionally injected at build time (ex: esbuild define) */
declare const DCL_MAX_COMPOSITE_ENTITY: number

/**
 * @public It only defines the type explicitly, no effects.
 */
export type uint32 = number
/**
 * @internal
 */
export const MAX_U16 = 0xffff
const MASK_UPPER_16_ON_32 = 0xffff0000

/**
 * @internal
 */
export const AMOUNT_VERSION_AVAILABLE = MAX_U16 + 1

/**
 * @public The Entity is a number type, the cast is only for typescript, the final javascript code treat as a number
 *  version  number
 * [31...16][15...0]
 *
 * Convertion from entity to its compound numbers:
 * To get the version => ((entity & MASK_UPPER_16_ON_32) >> 16) & MAX_U16
 * To get the number  => entity & MAX_U16
 *
 * Convertion from its compound numbers to entity:
 * entity = (entityNumber & MAX_U16) | ((entityVersion & MAX_U16) << 16)
 */
export type Entity = number & {
  __entity_type: ''
}
// This type matches with @dcl/crdt entity type.

/**
 * @internal
 */
export const MAX_ENTITY_NUMBER = MAX_U16

/**
 * This first 512 entities are reserved by the renderer
 */
export const RESERVED_STATIC_ENTITIES = 512

/**
 * @public
 */
export namespace EntityUtils {
  /**
   * @returns [entityNumber, entityVersion]
   */
  export function fromEntityId(entityId: Entity): [number, number] {
    return [(entityId & MAX_U16) >>> 0, (((entityId & MASK_UPPER_16_ON_32) >> 16) & MAX_U16) >>> 0]
  }

  /**
   * @returns compound number from entityNumber and entityVerison
   */
  export function toEntityId(entityNumber: number, entityVersion: number): Entity {
    return (((entityNumber & MAX_U16) | ((entityVersion & MAX_U16) << 16)) >>> 0) as Entity
  }
}

/**
 * @public
 */
export enum EntityState {
  Unknown = 0,

  /**
   * The entity was generated and added to the usedEntities set
   */
  UsedEntity = 1,

  /**
   * The entity was removed from current engine or remotely
   */
  Removed = 2,

  /**
   * The entity is reserved number.
   */
  Reserved = 3
}

/**
 * @public
 */
export type IEntityContainer = {
  generateEntity(networked?: boolean): Entity
  removeEntity(entity: Entity): boolean
  getEntityState(entity: Entity): EntityState

  getExistingEntities(): Set<Entity>

  releaseRemovedEntities(): Entity[]
  updateRemovedEntity(entity: Entity): boolean
  updateUsedEntity(entity: Entity): boolean
}

/**
 * The three entity numbers a scene may legitimately author components on: RootEntity 0,
 * PlayerEntity 1, CameraEntity 2. Everything from here up to `reservedStaticEntities` is
 * STREAMED by the renderer (the avatar range) — a different ownership regime, see
 * `isRendererStreamedNumber`.
 */
const NAMED_STATIC_ENTITIES = 3

/**
 * True when `entity`'s NUMBER is below `bound`, i.e. renderer-owned.
 *
 * Module-scope and mask-based on purpose. Masking beats `EntityUtils.fromEntityId`, which
 * allocates a `[number, number]` tuple per call just to read the number, and this runs on
 * every removeEntity/updateRemovedEntity/updateUsedEntity. `entity & MAX_U16` already lands
 * in [0, 65535], so fromEntityId's `>>> 0` is a no-op for the comparison. Declaring it out
 * here rather than inside the factory also avoids a closure per container.
 */
function isReservedNumber(entity: Entity, bound: number): boolean {
  return (entity & MAX_U16) < bound
}

/**
 * True when the renderer STREAMS this entity's components, so a scene must not purge them
 * locally: the renderer keeps the entity alive and never re-sends, and the scene's outgoing
 * deletes are dropped by its write guard.
 *
 * Deliberately NOT the whole reserved range. The renderer denies scene component ops only on
 * the avatar range; ops on RootEntity/PlayerEntity/CameraEntity pass through and ARE applied
 * — that is how `InputModifier.deleteFrom(engine.PlayerEntity)` clears an input lock, and its
 * wire frame is byte-identical to the one a removal emits. Treating those three like avatars
 * would silently turn a working removal into a no-op.
 *
 * @internal
 */
export function isRendererStreamedNumber(entity: Entity, bound: number = RESERVED_STATIC_ENTITIES): boolean {
  const entityNumber = (entity & MAX_U16) >>> 0
  return entityNumber >= NAMED_STATIC_ENTITIES && entityNumber < bound
}

/**
 * @public
 */
export function createEntityContainer(opts?: { reservedStaticEntities: number }): IEntityContainer {
  const reservedStaticEntities = opts?.reservedStaticEntities ?? RESERVED_STATIC_ENTITIES
  // If a build tool has set DCL_MAX_COMPOSITE_ENTITY (via esbuild define),
  // start the counter past composite entities to prevent ID collisions.
  const maxCompositeEntity = typeof DCL_MAX_COMPOSITE_ENTITY !== 'undefined' ? DCL_MAX_COMPOSITE_ENTITY : 0
  let entityCounter = Math.max(reservedStaticEntities, maxCompositeEntity > 0 ? maxCompositeEntity + 1 : 0)

  const usedEntities: Set<Entity> = new Set()
  let toRemoveEntities: Entity[] = []
  const removedEntities = createVersionGSet()

  function generateNewEntity(): Entity {
    if (entityCounter > MAX_ENTITY_NUMBER - 1) {
      throw new Error(`It fails trying to generate an entity out of range ${MAX_ENTITY_NUMBER}.`)
    }

    const entityNumber = entityCounter++
    const entityVersion = removedEntities.getMap().has(entityNumber)
      ? removedEntities.getMap().get(entityNumber)! + 1
      : 0
    const entity = EntityUtils.toEntityId(entityNumber, entityVersion)

    if (usedEntities.has(entity)) {
      return generateNewEntity()
    }

    usedEntities.add(entity)
    return entity
  }

  function generateEntity() {
    const usedSize = usedEntities.size

    // If all entities until `entityCounter` are being used, we need to generate another one
    if (usedSize + reservedStaticEntities >= entityCounter) {
      return generateNewEntity()
    }

    for (const [number, version] of removedEntities.getMap()) {
      // Skip renderer-reserved numbers. `removedEntities` is keyed by entity NUMBER,
      // and a DELETE_ENTITY arriving from the renderer for a remote player's avatar
      // slot used to seed one here (see updateRemovedEntity); recycling it handed the
      // scene an id the renderer independently reissues to the next joining peer —
      // both sides compute toEntityId(number, version + 1) from the same stored
      // version, so the two allocators produce the identical id in lockstep.
      if (number >= reservedStaticEntities && version < MAX_U16) {
        const entity = EntityUtils.toEntityId(number, version + 1)
        // If the entity is not being used, we can re-use it
        // If the entity was removed in this tick, we're not counting for the usedEntities, but we have it in the toRemoveEntityArray
        if (!usedEntities.has(entity) && !toRemoveEntities.includes(entity)) {
          usedEntities.add(entity)
          return entity
        }
      }
    }

    return generateNewEntity()
  }

  function removeEntity(entity: Entity) {
    if (isReservedNumber(entity, reservedStaticEntities)) return false

    if (usedEntities.has(entity)) {
      usedEntities.delete(entity)
      toRemoveEntities.push(entity)
    } else {
      updateRemovedEntity(entity)
    }

    return true
  }

  function releaseRemovedEntities() {
    const arr = toRemoveEntities

    if (arr.length) {
      toRemoveEntities = []
      for (const entity of arr) {
        const [n, v] = EntityUtils.fromEntityId(entity)
        removedEntities.addTo(n, v)
      }
    }

    return arr
  }

  function updateRemovedEntity(entity: Entity) {
    // The CRDT receive path calls this for EVERY inbound DELETE_ENTITY, including the
    // renderer's own tombstones for departed remote players. Recording a reserved
    // number here is what fed it to generateEntity's recycling loop; refuse it at the
    // door so the free list only ever holds numbers this container owns. Reserved
    // numbers need no tombstone anyway — getEntityState reports them as `Reserved`
    // before it ever consults `removedEntities`, so `Removed` is unreachable for them.
    if (isReservedNumber(entity, reservedStaticEntities)) return false

    const [n, v] = EntityUtils.fromEntityId(entity)

    // Update the removed entities map
    removedEntities.addTo(n, v)

    // Remove the usedEntities if exist
    for (let i = 0; i <= v; i++) {
      usedEntities.delete(EntityUtils.toEntityId(n, i))
    }

    return true
  }

  function updateUsedEntity(entity: Entity) {
    // Same invariant as updateRemovedEntity: this container tracks only the numbers it
    // owns. Reserved numbers are unreachable from the CRDT path today (getEntityState
    // returns `Reserved`, never `Unknown`, so nothing calls this for them), but the
    // `v > 0` branch below would seed `removedEntities` with a reserved number too.
    if (isReservedNumber(entity, reservedStaticEntities)) return false

    const [n, v] = EntityUtils.fromEntityId(entity)

    // if the entity was removed then abort fast
    if (removedEntities.has(n, v)) return false

    // Update
    if (v > 0) {
      for (let i = 0; i <= v - 1; i++) {
        usedEntities.delete(EntityUtils.toEntityId(n, i))
      }
      removedEntities.addTo(n, v - 1)
    }
    usedEntities.add(entity)
    return true
  }

  function getEntityState(entity: Entity): EntityState {
    const [n, v] = EntityUtils.fromEntityId(entity)
    if (n < reservedStaticEntities) {
      return EntityState.Reserved
    }

    if (usedEntities.has(entity)) {
      return EntityState.UsedEntity
    }

    const removedVersion = removedEntities.getMap().get(n)
    if (removedVersion !== undefined && removedVersion >= v) {
      return EntityState.Removed
    }

    return EntityState.Unknown
  }

  return {
    generateEntity,
    removeEntity,
    getExistingEntities(): Set<Entity> {
      return new Set(usedEntities)
    },

    getEntityState,
    releaseRemovedEntities,

    updateRemovedEntity,
    updateUsedEntity
  }
}
