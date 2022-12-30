import {
  AMOUNT_VERSION_AVAILABLE,
  Entity,
  EntityContainer,
  MAX_U16,
  RESERVED_STATIC_ENTITIES
} from '../../packages/@dcl/ecs/src/engine/entity'

describe('Entity container', () => {
  it('generates new static entities', () => {
    const entityContainer = EntityContainer()
    const entityA = entityContainer.generateEntity()
    expect(entityA).toBe(RESERVED_STATIC_ENTITIES)
    expect(entityContainer.entityExists(entityA)).toBe(true)
  })

  it('destroy entities', () => {
    const entityContainer = EntityContainer()
    const entityA = entityContainer.generateEntity()
    expect(entityContainer.removeEntity(entityA)).toBe(true)
    expect(entityContainer.entityExists(entityA)).toBe(false)
  })

  it('generates new entities', () => {
    const entityContainer = EntityContainer()
    const entityA = entityContainer.generateEntity()

    expect(entityA).toBe(RESERVED_STATIC_ENTITIES)

    expect(entityContainer.entityExists(entityA)).toBe(true)

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

    // since we consumed all entitites, generating another one is illegal
    expect(() => entityContainer.generateEntity()).toThrowError()

    // then we "return" that entity to the pool
    const randomEntityNumber = (32e3 +
      Math.round(Math.random() * 32e3)) as Entity
    entityContainer.removeEntity(randomEntityNumber)

    // and since we have availability, another one can be generated
    expect(() => entityContainer.generateEntity()).not.toThrowError()
  }, 10000)

  it(`should drain the all versions of entity number ${RESERVED_STATIC_ENTITIES}`, () => {
    const entityContainer = EntityContainer()

    for (let i = 0; i < AMOUNT_VERSION_AVAILABLE; i++) {
      const entity = entityContainer.generateEntity()
      expect(entity & 0xffff).toBe(RESERVED_STATIC_ENTITIES)

      entityContainer.removeEntity(entity)
    }

    const entity = entityContainer.generateEntity()
    expect(entity & 0xffff).not.toBe(RESERVED_STATIC_ENTITIES)
  })
})
