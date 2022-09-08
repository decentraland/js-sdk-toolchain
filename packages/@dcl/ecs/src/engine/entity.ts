import { EntityUtils } from './entity-utils'

declare const entitySymbol: unique symbol
/**
 * @public
 */
export type IEntity = number & { [entitySymbol]: true }

export function EntityContainer() {
  const staticEntity = Entity(EntityUtils.STATIC_ENTITIES_RANGE)
  const dynamicEntity = Entity(EntityUtils.DYNAMIC_ENTITIES_RANGE)
  return {
    generateEntity(dynamic: boolean = false): IEntity {
      if (dynamic) {
        return dynamicEntity.generateEntity()
      } else {
        return staticEntity.generateEntity()
      }
    },
    removeEntity(entity: IEntity): boolean {
      return (
        staticEntity.removeEntity(entity) || dynamicEntity.removeEntity(entity)
      )
    },
    isEntityExists(entity: IEntity): boolean {
      return (
        EntityUtils.isReservedEntity(entity) ||
        staticEntity.getExistingEntities().has(entity) ||
        dynamicEntity.getExistingEntities().has(entity)
      )
    },
    getExistingEntities(): Set<IEntity> {
      return new Set([
        ...staticEntity.getExistingEntities(),
        ...dynamicEntity.getExistingEntities()
      ])
    }
  }
}

function Entity(range: EntityUtils.EntityRange) {
  function createEntity(entity: number): IEntity {
    return entity as IEntity
  }

  let entityCounter = range[0]
  const usedEntities: Set<IEntity> = new Set()

  function generateEntity(): IEntity {
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

  function removeEntity(entity: IEntity) {
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
