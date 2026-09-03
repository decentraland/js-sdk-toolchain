import { components, cyclicParentingChecker } from '../../packages/@dcl/ecs/src'
import { Engine, Entity, IEngine } from '../../packages/@dcl/ecs/src/engine'

const errorFor = (entity: Entity) => `There is a cyclic parent with entity ${entity}`

describe('when a dirty transform is parented above a cycle it is not part of', () => {
  let engine: IEngine
  let Transform: ReturnType<typeof components.Transform>
  let consoleError: jest.SpyInstance
  let insideCycle: Entity
  let alsoInsideCycle: Entity
  let outsideCycle: Entity

  beforeEach(async () => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    engine = Engine()
    Transform = components.Transform(engine)
    engine.addSystem(cyclicParentingChecker(engine))

    insideCycle = engine.addEntity()
    alsoInsideCycle = engine.addEntity()
    outsideCycle = engine.addEntity()

    // The cycle is reported and settles on the tick its own members are dirty.
    Transform.create(insideCycle).parent = alsoInsideCycle
    Transform.create(alsoInsideCycle).parent = insideCycle
    await engine.update(1 / 30)
    consoleError.mockClear()

    // From here only the entity hanging off the cycle is dirty.
    Transform.create(outsideCycle).parent = insideCycle
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should finish the update instead of walking the cycle forever', async () => {
    await expect(engine.update(1 / 30)).resolves.toBeUndefined()
  })

  it('should report the entity whose ancestors reach the cycle', async () => {
    await engine.update(1 / 30)

    expect(consoleError).toHaveBeenCalledWith(errorFor(outsideCycle))
  })

  it('should report it once per tick', async () => {
    await engine.update(1 / 30)

    expect(consoleError).toHaveBeenCalledTimes(1)
  })
})

describe('when a dirty transform is its own parent', () => {
  let engine: IEngine
  let Transform: ReturnType<typeof components.Transform>
  let consoleError: jest.SpyInstance
  let entity: Entity

  beforeEach(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    engine = Engine()
    Transform = components.Transform(engine)
    engine.addSystem(cyclicParentingChecker(engine))

    entity = engine.addEntity()
    Transform.create(entity).parent = entity
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should report that entity', async () => {
    await engine.update(1 / 30)

    expect(consoleError).toHaveBeenCalledWith(errorFor(entity))
  })
})

describe('when a dirty transform has a parent chain that ends at the root', () => {
  let engine: IEngine
  let Transform: ReturnType<typeof components.Transform>
  let consoleError: jest.SpyInstance

  beforeEach(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    engine = Engine()
    Transform = components.Transform(engine)
    engine.addSystem(cyclicParentingChecker(engine))

    const root = engine.addEntity()
    const middle = engine.addEntity()
    const leaf = engine.addEntity()
    Transform.create(root)
    Transform.create(middle).parent = root
    Transform.create(leaf).parent = middle
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should not report anything', async () => {
    await engine.update(1 / 30)

    expect(consoleError).not.toHaveBeenCalled()
  })
})

describe('when two entities of the same cycle are dirty on the same tick', () => {
  let engine: IEngine
  let Transform: ReturnType<typeof components.Transform>
  let consoleError: jest.SpyInstance

  beforeEach(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    engine = Engine()
    Transform = components.Transform(engine)
    engine.addSystem(cyclicParentingChecker(engine))

    const first = engine.addEntity()
    const second = engine.addEntity()
    Transform.create(first).parent = second
    Transform.create(second).parent = first
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should report each of them', async () => {
    await engine.update(1 / 30)

    expect(consoleError).toHaveBeenCalledTimes(2)
  })
})
