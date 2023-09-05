import { createVersionGSet } from '../systems/crdt/gset'

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

// Max amount of local entities that can be created
export let RESERVED_LOCAL_ENTITIES = MAX_ENTITY_NUMBER

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
 * @intenral
 */
export type EntityContainer = {
  generateEntity(networked?: boolean): Entity
  removeEntity(entity: Entity): boolean
  getEntityState(entity: Entity): EntityState

  getExistingEntities(): Set<Entity>

  releaseRemovedEntities(): Entity[]
  updateRemovedEntity(entity: Entity): boolean
  updateUsedEntity(entity: Entity): boolean

  setNetworkEntitiesRange(reservedLocalEntities: number, range: [number, number]): void
  getConfig(): { reservedLocalEntities: number; reservedStaticEntities: number }
}

/**
 * @internal
 */
export function EntityContainer(): EntityContainer {
  // Local entities counter
  let entityCounter = RESERVED_STATIC_ENTITIES
  // Network entities counter
  let networkEntityCounter: number

  // Network entities range that can be created by the user
  let networkedEntitiesRange: [number, number]
  const usedEntities: Set<Entity> = new Set()

  let toRemoveEntities: Entity[] = []
  const removedEntities = createVersionGSet()

  function setNetworkEntitiesRange(reservedLocalEntities: number, range: [number, number]) {
    RESERVED_LOCAL_ENTITIES = reservedLocalEntities
    networkedEntitiesRange = range
    networkEntityCounter = range[0]
  }

  function generateNewEntity(networked?: boolean): Entity {
    if (entityCounter > MAX_ENTITY_NUMBER - 1) {
      throw new Error(`It fails trying to generate an entity out of range ${MAX_ENTITY_NUMBER}.`)
    }

    if (networked && networkEntityCounter >= networkedEntitiesRange[1]) {
      throw new Error('Max amount of network entities reached')
    }

    if (!networked && networkedEntitiesRange && entityCounter >= RESERVED_LOCAL_ENTITIES) {
      throw new Error(`Max amount of local entities reached ${RESERVED_LOCAL_ENTITIES} - ${entityCounter}`)
    }

    const entityNumber = networked ? networkEntityCounter++ : entityCounter++
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

  function generateEntity(networked?: boolean) {
    if (networked && !networkedEntitiesRange) {
      throw new Error('Network entities ranged not initialized. Connect to a CRDT Server')
    }

    // If all entities until `entityCounter` are being used, we need to generate another one
    if (!networked && usedEntities.size + RESERVED_STATIC_ENTITIES >= entityCounter) {
      return generateNewEntity(networked)
    }

    for (const [number, version] of removedEntities.getMap()) {
      if (version < MAX_U16) {
        if (networked && (number <= networkedEntitiesRange[0] || number >= networkedEntitiesRange[1])) continue
        if (!networked && number >= RESERVED_LOCAL_ENTITIES) continue

        const entity = EntityUtils.toEntityId(number, version + 1)
        // If the entity is not being used, we can re-use it
        // If the entity was removed in this tick, we're not counting for the usedEntities, but we have it in the toRemoveEntityArray
        if (!usedEntities.has(entity) && !toRemoveEntities.includes(entity)) {
          usedEntities.add(entity)
          return entity
        }
      }
    }

    return generateNewEntity(networked)
  }

  function removeEntity(entity: Entity) {
    if (entity < RESERVED_STATIC_ENTITIES) return false

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
    if (n < RESERVED_STATIC_ENTITIES) {
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
    setNetworkEntitiesRange,
    generateEntity,
    removeEntity,
    getExistingEntities(): Set<Entity> {
      return new Set(usedEntities)
    },

    getEntityState,
    releaseRemovedEntities,

    updateRemovedEntity,
    updateUsedEntity,
    getConfig: () => ({
      reservedLocalEntities: RESERVED_LOCAL_ENTITIES,
      reservedStaticEntities: RESERVED_STATIC_ENTITIES
    })
  }
}
