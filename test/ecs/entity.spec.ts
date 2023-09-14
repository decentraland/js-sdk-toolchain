import {
  AMOUNT_VERSION_AVAILABLE,
  Entity,
  EntityContainer,
  EntityState,
  MAX_U16,
  RESERVED_STATIC_ENTITIES,
  EntityUtils
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

    expect(Array.from(entityContainer.getExistingEntities())).toStrictEqual([entityA])
  })

  it('trying to remove entity', () => {
    const entityContainer = EntityContainer()
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

  it(`should not have effect the update of usedEntity with a removed one `, () => {
    const entityContainer = EntityContainer()

    const entity = entityContainer.generateEntity()
    entityContainer.removeEntity(entity)
    entityContainer.releaseRemovedEntities()

    expect(entityContainer.updateUsedEntity(entity)).toBe(false)
  })
  it('should failed to create a network entity if its not initialized', () => {
    const entityContainer = EntityContainer()
    expect(() => entityContainer.generateEntity(true)).toThrowError()
  })
})

describe('Entity container with network limits', () => {
  const entityContainer = EntityContainer()
  // [0, 511] is for reserved entities
  // [512, 514] is for local entities
  // [515, 524] is for network entities
  const localEntities = RESERVED_STATIC_ENTITIES + 2 // 512 && 513
  const networkRange: [number, number] = [localEntities, localEntities + 10]
  entityContainer.setNetworkEntitiesRange(localEntities, networkRange)
  let localEntity: Entity

  it('should create a local entity', () => {
    localEntity = entityContainer.generateEntity()
    expect(localEntity).toBe(512)
  })

  it('should remove the localEntity', () => {
    entityContainer.removeEntity(localEntity)
    entityContainer.releaseRemovedEntities()
  })

  it('should create the same entity number if a new one is creted', () => {
    const local = entityContainer.generateEntity()
    const [entityId, entityVersion] = EntityUtils.fromEntityId(local)
    expect(entityId).toBe(localEntity)
    expect(entityVersion).toBe(1)
  })

  it('should create one more entity and then reach the limit', () => {
    expect(entityContainer.generateEntity()).toBe(513)
    expect(() => entityContainer.generateEntity()).toThrowError('Max amount of local entities reached')
  })

  let networkEntity: Entity
  it('should create a network entity', () => {
    networkEntity = entityContainer.generateEntity(true)

    expect(networkEntity).toBe(networkRange[0])
    expect(networkEntity).toBe(514)
  })

  it('should reuse the same entity if its deleted', () => {
    entityContainer.removeEntity(networkEntity)
    entityContainer.releaseRemovedEntities()
    const reuseEntity = entityContainer.generateEntity(true)
    const [entityId, version] = EntityUtils.fromEntityId(reuseEntity)

    expect(entityId).toBe(networkEntity)
    expect(version).toBe(1)
  })

  it('should generate the range of entities without errors', () => {
    for (let entity = networkRange[0] + 1; entity <= networkRange[1]; entity++) {
      expect(entityContainer.generateEntity(true)).toBe(entity)
    }
    expect(() => entityContainer.generateEntity(true)).toThrowError('Max amount of network entities reached 524')
  })
  it('should remove last network entity and recreate it ', () => {
    entityContainer.removeEntity(524 as Entity)
    entityContainer.releaseRemovedEntities()
    const reuseEntity = entityContainer.generateEntity(true)
    const [entityId, version] = EntityUtils.fromEntityId(reuseEntity)

    expect(entityId).toBe(524)
    expect(version).toBe(1)
  })
  it('should remove last local entity and recreate it ', () => {
    entityContainer.removeEntity((localEntities - 1) as Entity)
    entityContainer.releaseRemovedEntities()
    const reuseEntity = entityContainer.generateEntity()
    const [entityId, version] = EntityUtils.fromEntityId(reuseEntity)

    expect(entityId).toBe(513)
    expect(version).toBe(1)
  })
})
