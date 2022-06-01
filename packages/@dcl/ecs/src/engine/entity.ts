import { EntityUtils } from './entity-utils'

declare const entitySymbol: unique symbol
/**
 * @public
 */
export type Entity = number & { [entitySymbol]: true }

export function EntityContainer() {
  const staticEntity = Entity()
  const dynamicEntity = Entity(true)
  return {
    generateEntity(dynamic: boolean = false): Entity {
      if (dynamic) return dynamicEntity.generateEntity()
      return staticEntity.generateEntity()
    },
    removeEntity(entity: Entity): void {
      staticEntity.removeEntity(entity)
      dynamicEntity.removeEntity(entity)
    },
    getUnusedEntities(): Set<Entity> {
      return new Set([
        ...staticEntity.getUnusedEntities(),
        ...dynamicEntity.getUnusedEntities()
      ])
    },
    getUsedEntities(): Set<Entity> {
      return new Set([
        ...staticEntity.getUsedEntities(),
        ...dynamicEntity.getUsedEntities()
      ])
    }
  }
}

function Entity(withOffset: boolean = false) {
  function createEntity(entity: number): Entity {
    return entity as Entity
  }

  // TODO: getoffset from a server?
  const offset = withOffset ? EntityUtils.getOffset() : 0
  const usedEntities: Set<Entity> = new Set()
  const unusedEntities: Set<Entity> = new Set()

  function generateEntity(): Entity {
    if (!unusedEntities.size && !usedEntities.size) {
      const entity = createEntity(offset)
      usedEntities.add(entity)
      return entity
    }

    // TODO: what happens if we delete an entity
    // and creates a new one in the same tick
    const iterator = unusedEntities[Symbol.iterator]().next()
    if (iterator.done) {
      const entity = createEntity(Math.max(...usedEntities.values()) + 1)
      if (entity >= EntityUtils.MAX_ENTITIES + offset) {
        throw new Error('Entity rate limit exceed')
      }
      usedEntities.add(entity)
      return entity
    }

    const entity = iterator.value
    unusedEntities.delete(entity)
    usedEntities.add(entity)

    return entity
  }

  function removeEntity(entity: Entity) {
    if (!usedEntities.has(entity)) return
    usedEntities.delete(entity)
    unusedEntities.add(entity)
  }

  return {
    getUnusedEntities() {
      return new Set(unusedEntities)
    },
    getUsedEntities() {
      return new Set(usedEntities)
    },
    generateEntity,
    removeEntity
  }
}
