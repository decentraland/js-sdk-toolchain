import {
  components,
  createPhysicsSystem,
  Engine,
  IEngine,
  PhysicsSystem,
  KnockbackFalloff
} from '../../../packages/@dcl/ecs/src'

describe('Physics knockback helper system should', () => {
  function setup() {
    const engine: IEngine = Engine()
    const physics: PhysicsSystem = createPhysicsSystem(engine)
    const PhysicsCombinedImpulse = components.PhysicsCombinedImpulse(engine)
    const Transform = components.Transform(engine)
    const EngineInfo = components.EngineInfo(engine)

    // Place player at origin by default
    Transform.create(engine.PlayerEntity, { position: { x: 0, y: 0, z: 0 } })

    let tickNumber = 0
    async function tick(dt = 1) {
      EngineInfo.createOrReplace(engine.RootEntity, { tickNumber: ++tickNumber, frameNumber: tickNumber, totalRuntime: 0 })
      await engine.update(dt)
    }

    return { engine, physics, PhysicsCombinedImpulse, Transform, tick }
  }

  it('push player away from source position', async () => {
    const { engine, physics, PhysicsCombinedImpulse, tick } = setup()

    await tick()
    // Source at (-10, 0, 0), player at origin -> push in +X direction
    physics.applyKnockbackToPlayer({ x: -10, y: 0, z: 0 }, 20)

    const impulse = PhysicsCombinedImpulse.get(engine.PlayerEntity)
    expect(impulse.vector!.x).toBeCloseTo(20, 5)
    expect(impulse.vector!.y).toBeCloseTo(0, 5)
    expect(impulse.vector!.z).toBeCloseTo(0, 5)
  })

  it('push upward when player is at source position (distance = 0)', async () => {
    const { engine, physics, PhysicsCombinedImpulse, tick } = setup()

    await tick()
    physics.applyKnockbackToPlayer({ x: 0, y: 0, z: 0 }, 15)

    const impulse = PhysicsCombinedImpulse.get(engine.PlayerEntity)
    expect(impulse.vector!.x).toBeCloseTo(0, 5)
    expect(impulse.vector!.y).toBeCloseTo(15, 5)
    expect(impulse.vector!.z).toBeCloseTo(0, 5)
  })

  it('no impulse when player is outside radius', async () => {
    const { engine, physics, PhysicsCombinedImpulse, tick } = setup()

    await tick()
    // Player at origin, source at (20, 0, 0) -> distance=20, radius=5 -> out of range
    physics.applyKnockbackToPlayer({ x: 20, y: 0, z: 0 }, 10, 5)

    expect(PhysicsCombinedImpulse.getOrNull(engine.PlayerEntity)).toBeNull()
  })

  it('apply impulse when player is inside radius', async () => {
    const { engine, physics, PhysicsCombinedImpulse, tick } = setup()

    await tick()
    // Player at origin, source at (3, 0, 0) -> distance=3, radius=10 -> in range
    physics.applyKnockbackToPlayer({ x: 3, y: 0, z: 0 }, 25, 10)

    const impulse = PhysicsCombinedImpulse.get(engine.PlayerEntity)
    // Direction is from source toward player: normalize(0-3, 0, 0) = (-1, 0, 0)
    expect(impulse.vector!.x).toBeCloseTo(-25, 5)
    expect(impulse.vector!.y).toBeCloseTo(0, 5)
    expect(impulse.vector!.z).toBeCloseTo(0, 5)
  })

  it('constant falloff gives full magnitude regardless of distance', async () => {
    const { engine, physics, PhysicsCombinedImpulse, Transform, tick } = setup()

    Transform.createOrReplace(engine.PlayerEntity, { position: { x: 8, y: 0, z: 0 } })

    await tick()
    physics.applyKnockbackToPlayer({ x: 0, y: 0, z: 0 }, 30, 10, KnockbackFalloff.CONSTANT)

    const impulse = PhysicsCombinedImpulse.get(engine.PlayerEntity)
    const mag = Math.sqrt(impulse.vector!.x ** 2 + impulse.vector!.y ** 2 + impulse.vector!.z ** 2)
    expect(mag).toBeCloseTo(30, 5)
  })

  it('linear falloff decreases with distance', async () => {
    const { engine, physics, PhysicsCombinedImpulse, Transform, tick } = setup()

    // Player at (5, 0, 0), source at origin, distance=5, radius=10
    // Linear: magnitude * (1 - 5/10) = 50 * 0.5 = 25
    Transform.createOrReplace(engine.PlayerEntity, { position: { x: 5, y: 0, z: 0 } })

    await tick()
    physics.applyKnockbackToPlayer({ x: 0, y: 0, z: 0 }, 50, 10, KnockbackFalloff.LINEAR)

    const impulse = PhysicsCombinedImpulse.get(engine.PlayerEntity)
    const mag = Math.sqrt(impulse.vector!.x ** 2 + impulse.vector!.y ** 2 + impulse.vector!.z ** 2)
    expect(mag).toBeCloseTo(25, 5)
    expect(impulse.vector!.x).toBeCloseTo(25, 5)
  })

  it('linear falloff at radius edge produces no impulse', async () => {
    const { engine, physics, PhysicsCombinedImpulse, Transform, tick } = setup()

    // distance=10, radius=10 -> Linear: magnitude * (1 - 10/10) = 0 -> zero vector -> skipped
    Transform.createOrReplace(engine.PlayerEntity, { position: { x: 10, y: 0, z: 0 } })

    await tick()
    physics.applyKnockbackToPlayer({ x: 0, y: 0, z: 0 }, 50, 10, KnockbackFalloff.LINEAR)

    expect(PhysicsCombinedImpulse.getOrNull(engine.PlayerEntity)).toBeNull()
  })

  it('inverse square falloff drops sharply with distance', async () => {
    const { engine, physics, PhysicsCombinedImpulse, Transform, tick } = setup()

    // Player at (3, 0, 0), source at origin, distance=3
    // InverseSquare: magnitude / (distance^2 + 1) = 100 / (9 + 1) = 10
    Transform.createOrReplace(engine.PlayerEntity, { position: { x: 3, y: 0, z: 0 } })

    await tick()
    physics.applyKnockbackToPlayer({ x: 0, y: 0, z: 0 }, 100, 20, KnockbackFalloff.INVERSE_SQUARE)

    const impulse = PhysicsCombinedImpulse.get(engine.PlayerEntity)
    const mag = Math.sqrt(impulse.vector!.x ** 2 + impulse.vector!.y ** 2 + impulse.vector!.z ** 2)
    expect(mag).toBeCloseTo(10, 5)
  })

  it('accumulate with other impulses in the same frame', async () => {
    const { engine, physics, PhysicsCombinedImpulse, tick } = setup()

    await tick()
    physics.applyImpulseToPlayer({ x: 0, y: 10, z: 0 })
    physics.applyKnockbackToPlayer({ x: -5, y: 0, z: 0 }, 20)

    const impulse = PhysicsCombinedImpulse.get(engine.PlayerEntity)
    expect(impulse.vector!.x).toBeCloseTo(20, 5)
    expect(impulse.vector!.y).toBeCloseTo(10, 5)
    expect(impulse.vector!.z).toBeCloseTo(0, 5)
  })

  it('handle diagonal direction correctly', async () => {
    const { engine, physics, PhysicsCombinedImpulse, Transform, tick } = setup()

    // Player at (3, 0, 4), source at origin -> distance = 5
    Transform.createOrReplace(engine.PlayerEntity, { position: { x: 3, y: 0, z: 4 } })

    await tick()
    physics.applyKnockbackToPlayer({ x: 0, y: 0, z: 0 }, 10)

    const impulse = PhysicsCombinedImpulse.get(engine.PlayerEntity)
    // Direction = normalize(3, 0, 4) = (0.6, 0, 0.8), scaled by 10
    expect(impulse.vector!.x).toBeCloseTo(6, 5)
    expect(impulse.vector!.y).toBeCloseTo(0, 5)
    expect(impulse.vector!.z).toBeCloseTo(8, 5)
  })
})
