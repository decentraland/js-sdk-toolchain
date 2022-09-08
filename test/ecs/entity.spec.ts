import {
  IEntity,
  EntityContainer
} from '../../packages/@dcl/ecs/src/engine/entity'
import EntityUtils from '../../packages/@dcl/ecs/src/engine/entity-utils'

describe('Entity container', () => {
  it('generates new static entities', () => {
    const entityContainer = EntityContainer()
    const entityA = entityContainer.generateEntity()
    expect(entityA).toBe(EntityUtils.STATIC_ENTITIES_RANGE[0])
    expect(entityContainer.isEntityExists(entityA)).toBe(true)
  })

  it('destroy entities', () => {
    const entityContainer = EntityContainer()
    const entityA = entityContainer.generateEntity()
    expect(entityContainer.removeEntity(entityA)).toBe(true)
    expect(entityContainer.isEntityExists(entityA)).toBe(false)
  })

  it('generates new entities', () => {
    const entityContainer = EntityContainer()

    const rootEntity = 0 as IEntity
    const entityA = entityContainer.generateEntity()
    const dynEntityA = entityContainer.generateEntity(true)

    expect(entityA).toBe(EntityUtils.STATIC_ENTITIES_RANGE[0])
    expect(dynEntityA).toBe(EntityUtils.DYNAMIC_ENTITIES_RANGE[0])

    expect(entityContainer.isEntityExists(entityA)).toBe(true)

    expect(EntityUtils.isReservedEntity(rootEntity)).toBe(true)
    expect(EntityUtils.isStaticEntity(rootEntity)).toBe(false)
    expect(EntityUtils.isDynamicEntity(rootEntity)).toBe(false)

    expect(EntityUtils.isReservedEntity(entityA)).toBe(false)
    expect(EntityUtils.isStaticEntity(entityA)).toBe(true)
    expect(EntityUtils.isDynamicEntity(entityA)).toBe(false)

    expect(EntityUtils.isReservedEntity(dynEntityA)).toBe(false)
    expect(EntityUtils.isStaticEntity(dynEntityA)).toBe(false)
    expect(EntityUtils.isDynamicEntity(dynEntityA)).toBe(true)

    expect(dynEntityA).toBe(EntityUtils.DYNAMIC_ENTITIES_RANGE[0])

    expect(Array.from(entityContainer.getExistingEntities())).toStrictEqual([
      entityA,
      dynEntityA
    ])
  })

  it('trying to remove arbitrary entity', () => {
    const entityContainer = EntityContainer()
    expect(entityContainer.removeEntity(1 as IEntity)).toBe(false)
  })

  it('should fail with creating entity out of range', () => {
    const realValue = EntityUtils.STATIC_ENTITIES_RANGE[1]

    function changeRange(value: number) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      EntityUtils.STATIC_ENTITIES_RANGE[1] = value
    }

    changeRange(600)

    const entityContainer = EntityContainer()
    const RangeMock = EntityUtils.STATIC_ENTITIES_RANGE

    for (let i = RangeMock[0]; i < RangeMock[1]; i++) {
      entityContainer.generateEntity()
    }

    expect(() => {
      entityContainer.generateEntity()
    }).toThrowError()

    changeRange(realValue)
  })
})
