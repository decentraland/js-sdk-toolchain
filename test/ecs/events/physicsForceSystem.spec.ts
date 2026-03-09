import {
  components,
  createPhysicsSystem,
  Engine,
  IEngine,
  PhysicsSystem
} from '../../../packages/@dcl/ecs/src'

describe('Physics force helper system should', () => {
  function setup() {
    const engine: IEngine = Engine()
    const physics: PhysicsSystem = createPhysicsSystem(engine)
    const PhysicsCombinedForce = components.PhysicsCombinedForce(engine)
    return { engine, physics, PhysicsCombinedForce }
  }

  it('apply a single force from one source', async () => {
    const { engine, physics, PhysicsCombinedForce } = setup()
    const srcA = engine.addEntity()

    await engine.update(1)
    physics.applyForceToPlayer(srcA, { x: 10, y: 0, z: 0 })

    const force = PhysicsCombinedForce.get(engine.PlayerEntity)
    expect(force.vector).toEqual({ x: 10, y: 0, z: 0 })
  })

  it('sum two forces from different sources', async () => {
    const { engine, physics, PhysicsCombinedForce } = setup()
    const srcA = engine.addEntity()
    const srcB = engine.addEntity()

    await engine.update(1)
    physics.applyForceToPlayer(srcA, { x: 10, y: 0, z: 0 })
    physics.applyForceToPlayer(srcB, { x: 0, y: 0, z: 5 })

    const force = PhysicsCombinedForce.get(engine.PlayerEntity)
    expect(force.vector).toEqual({ x: 10, y: 0, z: 5 })
  })

  it('sum three forces from different sources', async () => {
    const { engine, physics, PhysicsCombinedForce } = setup()
    const srcA = engine.addEntity()
    const srcB = engine.addEntity()
    const srcC = engine.addEntity()

    await engine.update(1)
    physics.applyForceToPlayer(srcA, { x: 1, y: 0, z: 0 })
    physics.applyForceToPlayer(srcB, { x: 0, y: 2, z: 0 })
    physics.applyForceToPlayer(srcC, { x: 0, y: 0, z: 3 })

    const force = PhysicsCombinedForce.get(engine.PlayerEntity)
    expect(force.vector).toEqual({ x: 1, y: 2, z: 3 })
  })

  it('remove one source and recompute the sum', async () => {
    const { engine, physics, PhysicsCombinedForce } = setup()
    const srcA = engine.addEntity()
    const srcB = engine.addEntity()

    await engine.update(1)
    physics.applyForceToPlayer(srcA, { x: 10, y: 0, z: 0 })
    physics.applyForceToPlayer(srcB, { x: 0, y: 0, z: 5 })
    physics.removeForceFromPlayer(srcA)

    const force = PhysicsCombinedForce.get(engine.PlayerEntity)
    expect(force.vector).toEqual({ x: 0, y: 0, z: 5 })
  })

  it('delete the component when all sources are removed', async () => {
    const { engine, physics, PhysicsCombinedForce } = setup()
    const srcA = engine.addEntity()
    const srcB = engine.addEntity()

    await engine.update(1)
    physics.applyForceToPlayer(srcA, { x: 10, y: 0, z: 0 })
    physics.applyForceToPlayer(srcB, { x: 0, y: 5, z: 0 })
    physics.removeForceFromPlayer(srcA)
    physics.removeForceFromPlayer(srcB)

    expect(PhysicsCombinedForce.getOrNull(engine.PlayerEntity)).toBeNull()
  })

  it('no-op when removing a source that is not registered', async () => {
    const { engine, physics, PhysicsCombinedForce } = setup()
    const srcA = engine.addEntity()
    const srcUnknown = engine.addEntity()

    await engine.update(1)
    physics.applyForceToPlayer(srcA, { x: 10, y: 0, z: 0 })
    physics.removeForceFromPlayer(srcUnknown)

    const force = PhysicsCombinedForce.get(engine.PlayerEntity)
    expect(force.vector).toEqual({ x: 10, y: 0, z: 0 })
  })

  it('replace force when same source calls applyForceToPlayer again', async () => {
    const { engine, physics, PhysicsCombinedForce } = setup()
    const srcA = engine.addEntity()

    await engine.update(1)
    physics.applyForceToPlayer(srcA, { x: 10, y: 0, z: 0 })
    physics.applyForceToPlayer(srcA, { x: 0, y: 20, z: 0 })

    const force = PhysicsCombinedForce.get(engine.PlayerEntity)
    expect(force.vector).toEqual({ x: 0, y: 20, z: 0 })
  })

  it('apply force with vector and magnitude overload', async () => {
    const { engine, physics, PhysicsCombinedForce } = setup()
    const srcA = engine.addEntity()

    await engine.update(1)
    physics.applyForceToPlayer(srcA, { x: 0, y: 1, z: 0 }, 15)

    const force = PhysicsCombinedForce.get(engine.PlayerEntity)
    expect(force.vector!.x).toBeCloseTo(0)
    expect(force.vector!.y).toBeCloseTo(15)
    expect(force.vector!.z).toBeCloseTo(0)
  })

  it('normalize non-unit vector in magnitude overload', async () => {
    const { engine, physics, PhysicsCombinedForce } = setup()
    const srcA = engine.addEntity()

    await engine.update(1)
    physics.applyForceToPlayer(srcA, { x: 3, y: 0, z: 4 }, 10)

    const force = PhysicsCombinedForce.get(engine.PlayerEntity)
    expect(force.vector!.x).toBeCloseTo(6)
    expect(force.vector!.y).toBeCloseTo(0)
    expect(force.vector!.z).toBeCloseTo(8)
  })

  it('persist force across ticks unchanged', async () => {
    const { engine, physics, PhysicsCombinedForce } = setup()
    const srcA = engine.addEntity()

    await engine.update(1)
    physics.applyForceToPlayer(srcA, { x: 10, y: 0, z: 0 })

    const force1 = PhysicsCombinedForce.get(engine.PlayerEntity)
    expect(force1.vector).toEqual({ x: 10, y: 0, z: 0 })

    await engine.update(1)

    const force2 = PhysicsCombinedForce.get(engine.PlayerEntity)
    expect(force2.vector).toEqual({ x: 10, y: 0, z: 0 })
  })

  it('throw error when component is modified externally', async () => {
    const { engine, physics, PhysicsCombinedForce } = setup()
    const srcA = engine.addEntity()
    const srcB = engine.addEntity()

    await engine.update(1)
    physics.applyForceToPlayer(srcA, { x: 1, y: 0, z: 0 })

    PhysicsCombinedForce.createOrReplace(engine.PlayerEntity, {
      vector: { x: 99, y: 0, z: 0 }
    })

    expect(() => {
      physics.applyForceToPlayer(srcB, { x: 0, y: 1, z: 0 })
    }).toThrow(/modified outside Physics helper/)
  })

  it('not throw on first call (no prior state)', async () => {
    const { engine, physics } = setup()
    const srcA = engine.addEntity()

    await engine.update(1)
    expect(() => {
      physics.applyForceToPlayer(srcA, { x: 5, y: 0, z: 0 })
    }).not.toThrow()
  })
})
