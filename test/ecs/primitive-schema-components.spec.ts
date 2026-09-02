import { Engine, Entity, Schemas } from '../../packages/@dcl/ecs/src'

describe('when a component is defined straight from a number schema', () => {
  let engine: ReturnType<typeof Engine>
  let Counter: ReturnType<typeof engine.defineComponentFromSchema<number>>
  let withDefault: Entity
  let withValue: Entity

  beforeEach(() => {
    engine = Engine()
    Counter = engine.defineComponentFromSchema('test::counter', Schemas.Int)
    withDefault = engine.addEntity()
    withValue = engine.addEntity()
    Counter.create(withDefault)
    Counter.create(withValue, 5)
  })

  it('should read a default of zero back as zero', () => {
    expect(Counter.get(withDefault)).toBe(0)
  })

  it('should read a set value back as itself', () => {
    expect(Counter.get(withValue)).toBe(5)
  })

  it('should report a default of zero as present', () => {
    expect(Counter.getOrNull(withDefault)).toBe(0)
  })

  it('should refuse to create it twice even when the value is falsy', () => {
    expect(() => Counter.create(withDefault)).toThrow('already exists')
  })
})

describe('when a component is defined straight from a boolean schema', () => {
  let engine: ReturnType<typeof Engine>
  let Flag: ReturnType<typeof engine.defineComponentFromSchema<boolean>>
  let entity: Entity

  beforeEach(() => {
    engine = Engine()
    Flag = engine.defineComponentFromSchema('test::flag', Schemas.Boolean)
    entity = engine.addEntity()
    Flag.create(entity, false)
  })

  it('should read false back as false', () => {
    expect(Flag.get(entity)).toBe(false)
  })

  it('should not report it as missing', () => {
    expect(Flag.getOrNull(entity)).not.toBeNull()
  })
})

describe('when a component is defined straight from an array schema', () => {
  let engine: ReturnType<typeof Engine>
  let Scores: ReturnType<typeof engine.defineComponentFromSchema<number[]>>
  let entity: Entity

  beforeEach(() => {
    engine = Engine()
    Scores = engine.defineComponentFromSchema('test::scores', Schemas.Array(Schemas.Int))
    entity = engine.addEntity()
    Scores.create(entity, [1, 2, 3])
  })

  it('should read back as an array', () => {
    expect(Scores.get(entity)).toEqual([1, 2, 3])
  })
})

describe('when a component that is absent is read', () => {
  let engine: ReturnType<typeof Engine>
  let Counter: ReturnType<typeof engine.defineComponentFromSchema<number>>
  let entity: Entity

  beforeEach(() => {
    engine = Engine()
    Counter = engine.defineComponentFromSchema('test::counter', Schemas.Int)
    entity = engine.addEntity()
  })

  it('should still throw from get', () => {
    expect(() => Counter.get(entity)).toThrow('not found')
  })

  it('should still be null from getOrNull', () => {
    expect(Counter.getOrNull(entity)).toBeNull()
  })
})
