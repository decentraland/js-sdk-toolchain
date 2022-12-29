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

export function EntityContainer() {
  let entityCounter = RESERVED_STATIC_ENTITIES
  const usedEntities: Set<Entity> = new Set()

  let toRemoveEntities: Entity[] = []
  const removedEntities: Map<number, number> = new Map()

  function generateNewEntity(): Entity {
    if (entityCounter > MAX_ENTITY_NUMBER - 1) {
      throw new Error(
        `It fails trying to generate an entity out of range ${MAX_ENTITY_NUMBER}.`
      )
    }

    const entityNumber = entityCounter++
    const entityVersion = !removedEntities.has(entityNumber) ? 0 : (removedEntities.get(entityNumber)! + 1)
    const entity = EntityUtils.toEntityId(entityNumber, entityVersion)

    usedEntities.add(entity)
    return entity
  }

  function generateEntity() {
    if (usedEntities.size + RESERVED_STATIC_ENTITIES >= entityCounter) {
      return generateNewEntity()
    }

    for (const [number, version] of removedEntities) {
      if (version < MAX_U16) {
        const entity = EntityUtils.toEntityId(number, version + 1)

        usedEntities.add(entity)
        removedEntities.delete(number)

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
      removedEntities.set(n, v)
    }
    return arr
  }

  function updateRemovedEntity(entity: Entity) {
    const [n, v] = EntityUtils.fromEntityId(entity)

    // Update the removed entities map
    removedEntities.set(n, v)

    // Remove the usedEntities if exist
    for (let i = 0; i <= v; i++) {
      usedEntities.delete(EntityUtils.toEntityId(n, i))
    }
  }

  function updateUsedEntity(entity: Entity) {
    const [n, v] = EntityUtils.fromEntityId(entity)

    // Update
    if (v > 0) {
      for (let i = 0; i <= v - 1; i++) {
        usedEntities.delete(EntityUtils.toEntityId(n, i))
      }
      removedEntities.set(n, v - 1)
    }

  }

  return {
    generateEntity,
    removeEntity,
    entityExists(entity: Entity): boolean {
      return entity < RESERVED_STATIC_ENTITIES || usedEntities.has(entity)
    },
    getExistingEntities(): Set<Entity> {
      return new Set(usedEntities)
    },
    releaseRemovedEntities,

    updateRemovedEntity,
    updateUsedEntity
  }
}
