/**
 * @public Only for explicitation purposes
 */
export type uint32 = number
export const MAX_U16 = 0xffff
export const MASK_UPPER_16_ON_32 = 0xffff0000

export const AMOUNT_VERSION_AVAILABLE = MAX_U16 + 1

/**
 * @public
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
export type Entity = uint32 & { __entity_type: '' }

/**
 * @public This first 512 entities are reserved by the renderer
 */
export const RESERVED_STATIC_ENTITIES = 512

/**
 * @public
 */
export const MAX_ENTITY_NUMBER = MAX_U16

export function EntityContainer() {
  let entityCounter = RESERVED_STATIC_ENTITIES
  const usedEntities: Set<Entity> = new Set()
  const removedEntities: Map<number, number> = new Map()

  function entityVersion(entity: Entity) {
    return (((entity & MASK_UPPER_16_ON_32) >> 16) & MAX_U16) >>> 0
  }

  function entityNumber(entity: Entity) {
    return (entity & MAX_U16) >>> 0
  }

  function entityId(entityNumber: number, entityVersion: number): Entity {
    return (((entityNumber & MAX_U16) | ((entityVersion & MAX_U16) << 16)) >>>
      0) as Entity
  }

  function generateNewEntity(): Entity {
    if (entityCounter > MAX_ENTITY_NUMBER - 1) {
      throw new Error(
        `It fails trying to generate an entity out of range ${MAX_ENTITY_NUMBER}.`
      )
    }

    const entity = entityCounter++ as Entity
    usedEntities.add(entity)
    return entity
  }

  function generateEntity() {
    if (usedEntities.size + RESERVED_STATIC_ENTITIES >= entityCounter) {
      return generateNewEntity()
    }

    for (const [number, version] of removedEntities) {
      if (version < MAX_U16) {
        const entity = entityId(number, version + 1)

        usedEntities.add(entity)
        removedEntities.delete(number)

        return entity
      }
    }

    return generateNewEntity()
  }

  function removeEntity(entity: Entity) {
    const deleted = usedEntities.delete(entity)
    if (deleted) {
      removedEntities.set(entityNumber(entity), entityVersion(entity))
    }
    return deleted
  }

  return {
    generateEntity(): Entity {
      return generateEntity()
    },
    removeEntity(entity: Entity): boolean {
      return removeEntity(entity)
    },
    entityExists(entity: Entity): boolean {
      return entity < RESERVED_STATIC_ENTITIES || usedEntities.has(entity)
    },
    getExistingEntities(): Set<Entity> {
      return new Set(usedEntities)
    },

    entityVersion,
    entityNumber,
    entityId
  }
}
