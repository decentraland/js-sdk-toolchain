import {
  components,
  createPhysicsSystem,
  Engine,
  IEngine,
  PhysicsSystem,
  PhysicsForceSpace
} from '../../../packages/@dcl/ecs/src'

describe('Physics force helper system should', () => {
  function setup() {
    const engine: IEngine = Engine()
    const physics: PhysicsSystem = createPhysicsSystem(engine)
    const PhysicsForce = components.PhysicsForce(engine)
    const Transform = components.Transform(engine)
    return { engine, physics, PhysicsForce, Transform }
  }

  it('apply a single force from one source', async () => {
    const { engine, physics, PhysicsForce } = setup()
    const srcA = engine.addEntity()

    await engine.update(1)
    physics.applyForceToPlayer(srcA, { x: 10, y: 0, z: 0 })

    const force = PhysicsForce.get(engine.PlayerEntity)
    expect(force.direction).toEqual({ x: 10, y: 0, z: 0 })
  })

  it('sum two forces from different sources', async () => {
    const { engine, physics, PhysicsForce } = setup()
    const srcA = engine.addEntity()
    const srcB = engine.addEntity()

    await engine.update(1)
    physics.applyForceToPlayer(srcA, { x: 10, y: 0, z: 0 })
    physics.applyForceToPlayer(srcB, { x: 0, y: 0, z: 5 })

    const force = PhysicsForce.get(engine.PlayerEntity)
    expect(force.direction).toEqual({ x: 10, y: 0, z: 5 })
  })

  it('sum three forces from different sources', async () => {
    const { engine, physics, PhysicsForce } = setup()
    const srcA = engine.addEntity()
    const srcB = engine.addEntity()
    const srcC = engine.addEntity()

    await engine.update(1)
    physics.applyForceToPlayer(srcA, { x: 1, y: 0, z: 0 })
    physics.applyForceToPlayer(srcB, { x: 0, y: 2, z: 0 })
    physics.applyForceToPlayer(srcC, { x: 0, y: 0, z: 3 })

    const force = PhysicsForce.get(engine.PlayerEntity)
    expect(force.direction).toEqual({ x: 1, y: 2, z: 3 })
  })

  it('remove one source and recompute the sum', async () => {
    const { engine, physics, PhysicsForce } = setup()
    const srcA = engine.addEntity()
    const srcB = engine.addEntity()

    await engine.update(1)
    physics.applyForceToPlayer(srcA, { x: 10, y: 0, z: 0 })
    physics.applyForceToPlayer(srcB, { x: 0, y: 0, z: 5 })
    physics.removeForceFromPlayer(srcA)

    const force = PhysicsForce.get(engine.PlayerEntity)
    expect(force.direction).toEqual({ x: 0, y: 0, z: 5 })
  })

  it('delete the component when all sources are removed', async () => {
    const { engine, physics, PhysicsForce } = setup()
    const srcA = engine.addEntity()
    const srcB = engine.addEntity()

    await engine.update(1)
    physics.applyForceToPlayer(srcA, { x: 10, y: 0, z: 0 })
    physics.applyForceToPlayer(srcB, { x: 0, y: 5, z: 0 })
    physics.removeForceFromPlayer(srcA)
    physics.removeForceFromPlayer(srcB)

    expect(PhysicsForce.getOrNull(engine.PlayerEntity)).toBeNull()
  })

  it('no-op when removing a source that is not registered', async () => {
    const { engine, physics, PhysicsForce } = setup()
    const srcA = engine.addEntity()
    const srcUnknown = engine.addEntity()

    await engine.update(1)
    physics.applyForceToPlayer(srcA, { x: 10, y: 0, z: 0 })
    physics.removeForceFromPlayer(srcUnknown)

    const force = PhysicsForce.get(engine.PlayerEntity)
    expect(force.direction).toEqual({ x: 10, y: 0, z: 0 })
  })

  it('replace force when same source calls applyForceToPlayer again', async () => {
    const { engine, physics, PhysicsForce } = setup()
    const srcA = engine.addEntity()

    await engine.update(1)
    physics.applyForceToPlayer(srcA, { x: 10, y: 0, z: 0 })
    physics.applyForceToPlayer(srcA, { x: 0, y: 20, z: 0 })

    const force = PhysicsForce.get(engine.PlayerEntity)
    expect(force.direction).toEqual({ x: 0, y: 20, z: 0 })
  })

  it('apply force with direction and magnitude overload', async () => {
    const { engine, physics, PhysicsForce } = setup()
    const srcA = engine.addEntity()

    await engine.update(1)
    physics.applyForceToPlayer(srcA, { x: 0, y: 1, z: 0 }, 15)

    const force = PhysicsForce.get(engine.PlayerEntity)
    expect(force.direction!.x).toBeCloseTo(0)
    expect(force.direction!.y).toBeCloseTo(15)
    expect(force.direction!.z).toBeCloseTo(0)
  })

  it('normalize non-unit direction in magnitude overload', async () => {
    const { engine, physics, PhysicsForce } = setup()
    const srcA = engine.addEntity()

    await engine.update(1)
    physics.applyForceToPlayer(srcA, { x: 3, y: 0, z: 4 }, 10)

    const force = PhysicsForce.get(engine.PlayerEntity)
    expect(force.direction!.x).toBeCloseTo(6)
    expect(force.direction!.y).toBeCloseTo(0)
    expect(force.direction!.z).toBeCloseTo(8)
  })

  it('convert LOCAL space to WORLD space using player rotation', async () => {
    const { engine, physics, PhysicsForce, Transform } = setup()
    const srcA = engine.addEntity()

    Transform.create(engine.PlayerEntity, {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: Math.SQRT1_2, z: 0, w: Math.SQRT1_2 },
      scale: { x: 1, y: 1, z: 1 }
    })

    await engine.update(1)
    physics.applyForceToPlayer(srcA, { x: 0, y: 0, z: 10 }, PhysicsForceSpace.PFS_LOCAL)

    const force = PhysicsForce.get(engine.PlayerEntity)
    expect(force.direction!.x).toBeCloseTo(10)
    expect(force.direction!.y).toBeCloseTo(0)
    expect(force.direction!.z).toBeCloseTo(0)
  })

  it('sum LOCAL and WORLD forces correctly', async () => {
    const { engine, physics, PhysicsForce, Transform } = setup()
    const srcA = engine.addEntity()
    const srcB = engine.addEntity()

    Transform.create(engine.PlayerEntity, {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: Math.SQRT1_2, z: 0, w: Math.SQRT1_2 },
      scale: { x: 1, y: 1, z: 1 }
    })

    await engine.update(1)
    physics.applyForceToPlayer(srcA, { x: 0, y: 5, z: 0 }, PhysicsForceSpace.PFS_WORLD)
    physics.applyForceToPlayer(srcB, { x: 0, y: 0, z: 10 }, PhysicsForceSpace.PFS_LOCAL)

    const force = PhysicsForce.get(engine.PlayerEntity)
    expect(force.direction!.x).toBeCloseTo(10)
    expect(force.direction!.y).toBeCloseTo(5)
    expect(force.direction!.z).toBeCloseTo(0)
  })

  it('recalculate LOCAL forces every tick when player rotates', async () => {
    const { engine, physics, PhysicsForce, Transform } = setup()
    const srcA = engine.addEntity()

    Transform.create(engine.PlayerEntity, {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1, y: 1, z: 1 }
    })

    await engine.update(1)
    physics.applyForceToPlayer(srcA, { x: 0, y: 0, z: 10 }, PhysicsForceSpace.PFS_LOCAL)

    const force1 = PhysicsForce.get(engine.PlayerEntity)
    expect(force1.direction!.x).toBeCloseTo(0)
    expect(force1.direction!.z).toBeCloseTo(10)

    // Rotate player 90 degrees around Y, then tick
    const mutable = Transform.getMutable(engine.PlayerEntity)
    mutable.rotation = { x: 0, y: Math.SQRT1_2, z: 0, w: Math.SQRT1_2 }

    await engine.update(1)

    const force2 = PhysicsForce.get(engine.PlayerEntity)
    expect(force2.direction!.x).toBeCloseTo(10)
    expect(force2.direction!.y).toBeCloseTo(0)
    expect(force2.direction!.z).toBeCloseTo(0)
  })

  it('throw error when component is modified externally', async () => {
    const { engine, physics, PhysicsForce } = setup()
    const srcA = engine.addEntity()
    const srcB = engine.addEntity()

    await engine.update(1)
    physics.applyForceToPlayer(srcA, { x: 1, y: 0, z: 0 })

    PhysicsForce.createOrReplace(engine.PlayerEntity, {
      direction: { x: 99, y: 0, z: 0 }
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

  it('apply force with direction + magnitude + LOCAL space overload', async () => {
    const { engine, physics, PhysicsForce, Transform } = setup()
    const srcA = engine.addEntity()

    Transform.create(engine.PlayerEntity, {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: Math.SQRT1_2, z: 0, w: Math.SQRT1_2 },
      scale: { x: 1, y: 1, z: 1 }
    })

    await engine.update(1)
    physics.applyForceToPlayer(srcA, { x: 0, y: 0, z: 1 }, 20, PhysicsForceSpace.PFS_LOCAL)

    const force = PhysicsForce.get(engine.PlayerEntity)
    expect(force.direction!.x).toBeCloseTo(20)
    expect(force.direction!.y).toBeCloseTo(0)
    expect(force.direction!.z).toBeCloseTo(0)
  })

  it('not recalculate every tick when all sources are WORLD', async () => {
    const { engine, physics, PhysicsForce } = setup()
    const srcA = engine.addEntity()

    await engine.update(1)
    physics.applyForceToPlayer(srcA, { x: 10, y: 0, z: 0 }, PhysicsForceSpace.PFS_WORLD)

    const force1 = PhysicsForce.get(engine.PlayerEntity)
    expect(force1.direction).toEqual({ x: 10, y: 0, z: 0 })

    // Externally modifying the component should NOT cause a throw on next tick
    // because recalcForce is not called when all sources are WORLD.
    // However, the next explicit applyForceToPlayer WILL detect it.
    // Here we just verify the force value persists across ticks unchanged.
    await engine.update(1)

    const force2 = PhysicsForce.get(engine.PlayerEntity)
    expect(force2.direction).toEqual({ x: 10, y: 0, z: 0 })
  })
})
