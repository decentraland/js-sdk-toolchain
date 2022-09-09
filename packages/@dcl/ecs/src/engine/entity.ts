import { EntityUtils } from './entity-utils'

declare const entitySymbol: unique symbol
/**
 * @public
 */
export type Entity = number & { [entitySymbol]: true }

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
    isEntityExists(entity: Entity): boolean {
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
