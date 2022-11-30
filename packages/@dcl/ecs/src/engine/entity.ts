import { EntityUtils } from './entity-utils'

/**
 * @public
 */
export type Entity = unknown

export function EntityContainer() {
  const staticEntity = Entity(EntityUtils.STATIC_ENTITIES_RANGE)
  const dynamicEntity = Entity(EntityUtils.DYNAMIC_ENTITIES_RANGE)
  return {
    generateEntity(dynamic: boolean = false): Entity {
      /* istanbul ignore next */
      if (dynamic) {
        // Dynamic entities are not being used, but since we dont know the future of the dynamic entities
        // I prefer to comment the code instead of removing all the logic
        /* istanbul ignore next */
        return dynamicEntity.generateEntity()
      } else {
        return staticEntity.generateEntity()
      }
    },
    removeEntity(entity: Entity): boolean {
      return (
        staticEntity.removeEntity(entity) || dynamicEntity.removeEntity(entity)
      )
    },
    entityExists(entity: Entity): boolean {
      return (
        EntityUtils.isReservedEntity(entity) ||
        staticEntity.getExistingEntities().has(entity) ||
        dynamicEntity.getExistingEntities().has(entity)
      )
    },
    getExistingEntities(): Set<Entity> {
      return new Set([
        ...staticEntity.getExistingEntities(),
        ...dynamicEntity.getExistingEntities()
      ])
    }
  }
}

function Entity(range: EntityUtils.EntityRange) {
  function createEntity(entity: number): Entity {
    return entity as Entity
  }

  let entityCounter = range[0]
  const usedEntities: Set<Entity> = new Set()

  function generateEntity(): Entity {
    if (entityCounter >= range[1]) {
      throw new Error(
        `It fails trying to generate an entity out of range [${range[0]}, ${range[1]}].`
      )
    }

    const entity = createEntity(entityCounter)
    entityCounter++

    usedEntities.add(entity)
    return entity
  }

  function removeEntity(entity: Entity) {
    return usedEntities.delete(entity)
  }

  return {
    getExistingEntities() {
      return new Set(usedEntities)
    },
    generateEntity,
    removeEntity
  }
}
