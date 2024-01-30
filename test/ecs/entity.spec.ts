import {
  AMOUNT_VERSION_AVAILABLE,
  Entity,
  createEntityContainer,
  EntityState,
  MAX_U16,
  RESERVED_STATIC_ENTITIES,
  EntityUtils
} from '../../packages/@dcl/ecs/src/engine/entity'

describe('Entity container', () => {
  it('generates new static entities', () => {
    const entityContainer = createEntityContainer()
    const entityA = entityContainer.generateEntity()
    expect(entityA).toBe(RESERVED_STATIC_ENTITIES)
    expect(entityContainer.getEntityState(entityA)).toBe(EntityState.UsedEntity)
  })

  it('destroy entities', () => {
    const entityContainer = createEntityContainer()
    const entityA = entityContainer.generateEntity()
    expect(entityContainer.getEntityState(entityA)).toBe(EntityState.UsedEntity)

    entityContainer.removeEntity(entityA)
    expect(entityContainer.getEntityState(entityA)).not.toBe(EntityState.UsedEntity)

    entityContainer.releaseRemovedEntities()
    expect(entityContainer.getEntityState(entityA)).toBe(EntityState.Removed)
  })

  it('generates new entities', () => {
    const entityContainer = createEntityContainer()
    const entityA = entityContainer.generateEntity()

    expect(entityA).toBe(RESERVED_STATIC_ENTITIES)

    expect(entityContainer.getEntityState(entityA)).toBe(EntityState.UsedEntity)

    expect(Array.from(entityContainer.getExistingEntities())).toStrictEqual([entityA])
  })

  it('trying to remove entity', () => {
    const entityContainer = createEntityContainer()
    // reserved entity
    expect(entityContainer.removeEntity(1 as Entity)).toBe(false)
    expect(entityContainer.getEntityState(1 as Entity)).toBe(EntityState.Reserved)

    // remove entity that wasn't used (add to GSet)
    expect(entityContainer.removeEntity(513 as Entity)).toBe(true)

    // update the internal gset state
    entityContainer.releaseRemovedEntities()

    // the first entity to receive
    expect(entityContainer.generateEntity()).toBe(512)

    // the second would be 513, but it was deleted, so we'll get the version 1 of 513
    expect(entityContainer.generateEntity()).toBe(EntityUtils.toEntityId(513, 1))
  })

  it('should fail with creating entity out of range', () => {
    const entityContainer = createEntityContainer()
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
    const entityContainer = createEntityContainer()

    for (let i = 0; i < AMOUNT_VERSION_AVAILABLE; i++) {
      const entity = entityContainer.generateEntity()
      expect(entity & 0xffff).toBe(RESERVED_STATIC_ENTITIES)

      entityContainer.removeEntity(entity)
      entityContainer.releaseRemovedEntities()
    }

    const entity = entityContainer.generateEntity()
    expect(entity & 0xffff).not.toBe(RESERVED_STATIC_ENTITIES)
  })

  it(`should not have effect the update of usedEntity with a removed one `, () => {
    const entityContainer = createEntityContainer()

    const entity = entityContainer.generateEntity()
    entityContainer.removeEntity(entity)
    entityContainer.releaseRemovedEntities()

    expect(entityContainer.updateUsedEntity(entity)).toBe(false)
  })
})
