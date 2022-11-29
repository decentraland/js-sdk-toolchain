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
      if (dynamic) {
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
  const freeList: Entity[] = []

  function generateEntity(): Entity {
    if (freeList.length) {
      const entity = freeList.pop()!
      entityCounter++

      usedEntities.add(entity)
      return entity
    }

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
    freeList.push(entity)
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
