import { createGSet } from '@dcl/crdt/dist/gset'

/**
 * @public It only defines the type explicitly, no effects.
 */
export type uint32 = number
export const MAX_U16 = 0xffff
export const MASK_UPPER_16_ON_32 = 0xffff0000

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
 * @public This first 512 entities are reserved by the renderer
 */
export const RESERVED_STATIC_ENTITIES = 512

/**
 * @public
 */
export const MAX_ENTITY_NUMBER = MAX_U16

export namespace EntityUtils {
  /**
   * @returns [entityNumber, entityVersion]
   */
  export function fromEntityId(entityId: Entity): [number, number] {
    return [
      (entityId & MAX_U16) >>> 0,
      (((entityId & MASK_UPPER_16_ON_32) >> 16) & MAX_U16) >>> 0
    ]
  }

  /**
   * @returns compound number from entityNumber and entityVerison
   */
  export function toEntityId(
    entityNumber: number,
    entityVersion: number
  ): Entity {
    return (((entityNumber & MAX_U16) | ((entityVersion & MAX_U16) << 16)) >>>
      0) as Entity
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

export type EntityContainer = {
  generateEntity(): Entity
  removeEntity(entity: Entity): boolean
  getEntityState(entity: Entity): EntityState

  getExistingEntities(): Set<Entity>

  releaseRemovedEntities(): Entity[]
  updateRemovedEntity(entity: Entity): boolean
  updateUsedEntity(entity: Entity): boolean
}

export function EntityContainer(): EntityContainer {
  let entityCounter = RESERVED_STATIC_ENTITIES
  const usedEntities: Set<Entity> = new Set()

  let toRemoveEntities: Entity[] = []
  const removedEntities = createGSet()

  function generateNewEntity(): Entity {
    if (entityCounter > MAX_ENTITY_NUMBER - 1) {
      throw new Error(
        `It fails trying to generate an entity out of range ${MAX_ENTITY_NUMBER}.`
      )
    }

    const entityNumber = entityCounter++
    const entityVersion = removedEntities.getMap().has(entityNumber)
      ? removedEntities.getMap().get(entityNumber)! + 1
      : 0
    const entity = EntityUtils.toEntityId(entityNumber, entityVersion)

    usedEntities.add(entity)
    return entity
  }

  function generateEntity() {
    if (usedEntities.size + RESERVED_STATIC_ENTITIES >= entityCounter) {
      return generateNewEntity()
    }

    for (const [number, version] of removedEntities.getMap()) {
      if (version < MAX_U16) {
        const entity = EntityUtils.toEntityId(number, version + 1)

        usedEntities.add(entity)

        return entity
      }
    }

    return generateNewEntity()
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
    toRemoveEntities = []
    for (const entity of arr) {
      const [n, v] = EntityUtils.fromEntityId(entity)
      removedEntities.addTo(n, v)
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

    const removedVersion = removedEntities.getMap().get(n)
    if (removedVersion !== undefined && removedVersion >= v) {
      return false
    }

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
