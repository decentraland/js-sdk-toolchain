import {
  AMOUNT_VERSION_AVAILABLE,
  Entity,
  EntityContainer,
  EntityState,
  MAX_U16,
  RESERVED_STATIC_ENTITIES
} from '../../packages/@dcl/ecs/src/engine/entity'

describe('Entity container', () => {
  it('generates new static entities', () => {
    const entityContainer = EntityContainer()
    const entityA = entityContainer.generateEntity()
    expect(entityA).toBe(RESERVED_STATIC_ENTITIES)
    expect(entityContainer.getEntityState(entityA)).toBe(EntityState.UsedEntity)
  })

  it('destroy entities', () => {
    const entityContainer = EntityContainer()
    const entityA = entityContainer.generateEntity()
    expect(entityContainer.getEntityState(entityA)).toBe(EntityState.UsedEntity)

    entityContainer.removeEntity(entityA)
    expect(entityContainer.getEntityState(entityA)).not.toBe(EntityState.UsedEntity)

    entityContainer.releaseRemovedEntities()
    expect(entityContainer.getEntityState(entityA)).toBe(EntityState.Removed)
  })

  it('generates new entities', () => {
    const entityContainer = EntityContainer()
    const entityA = entityContainer.generateEntity()

    expect(entityA).toBe(RESERVED_STATIC_ENTITIES)

    expect(entityContainer.getEntityState(entityA)).toBe(EntityState.UsedEntity)

    expect(Array.from(entityContainer.getExistingEntities())).toStrictEqual([
      entityA
    ])
  })

  it('trying to remove arbitrary entity', () => {
    const entityContainer = EntityContainer()
    expect(entityContainer.removeEntity(1 as Entity)).toBe(false)
  })

  it('should fail with creating entity out of range', () => {
    const entityContainer = EntityContainer()
    const entitiesAvailable = MAX_U16 - RESERVED_STATIC_ENTITIES
    for (let i = 0; i < entitiesAvailable; i++) {
      entityContainer.generateEntity()
    }
    expect(() => {
      entityContainer.generateEntity()
    }).toThrowError()

    entityContainer.removeEntity(50e3 as Entity)
    entityContainer.releaseRemovedEntities()

    expect(() => {
      entityContainer.generateEntity()
    }).not.toThrowError()
  })

  it(`should drain the all versions of entity number ${RESERVED_STATIC_ENTITIES}`, () => {
    const entityContainer = EntityContainer()

    for (let i = 0; i < AMOUNT_VERSION_AVAILABLE; i++) {
      const entity = entityContainer.generateEntity()
      expect(entity & 0xffff).toBe(RESERVED_STATIC_ENTITIES)

      entityContainer.removeEntity(entity)
      entityContainer.releaseRemovedEntities()
    }

    const entity = entityContainer.generateEntity()
    expect(entity & 0xffff).not.toBe(RESERVED_STATIC_ENTITIES)
  })
})
