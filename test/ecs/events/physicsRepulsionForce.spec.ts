import {
  components,
  createPhysicsSystem,
  Engine,
  IEngine,
  PhysicsSystem,
  KnockbackFalloff
} from '../../../packages/@dcl/ecs/src'

describe('Physics applyRepulsionForceToPlayer should', () => {
  function setup() {
    const engine: IEngine = Engine()
    const physics: PhysicsSystem = createPhysicsSystem(engine)
    const PhysicsCombinedForce = components.PhysicsCombinedForce(engine)
    const Transform = components.Transform(engine)

    // Place player at origin
    Transform.create(engine.PlayerEntity, { position: { x: 0, y: 0, z: 0 } })

    return { engine, physics, PhysicsCombinedForce, Transform }
  }

  it('push player away from position', async () => {
    const { engine, physics, PhysicsCombinedForce } = setup()
    const src = engine.addEntity()

    await engine.update(1)
    physics.applyRepulsionForceToPlayer(src, { x: -10, y: 0, z: 0 }, 20)

    const force = PhysicsCombinedForce.get(engine.PlayerEntity)
    expect(force.vector!.x).toBeCloseTo(20, 5)
    expect(force.vector!.y).toBeCloseTo(0, 5)
    expect(force.vector!.z).toBeCloseTo(0, 5)
  })

  it('push upward when player is at source position', async () => {
    const { engine, physics, PhysicsCombinedForce } = setup()
    const src = engine.addEntity()

    await engine.update(1)
    physics.applyRepulsionForceToPlayer(src, { x: 0, y: 0, z: 0 }, 10)

    const force = PhysicsCombinedForce.get(engine.PlayerEntity)
    expect(force.vector!.x).toBeCloseTo(0, 5)
    expect(force.vector!.y).toBeCloseTo(10, 5)
    expect(force.vector!.z).toBeCloseTo(0, 5)
  })

  it('recalculate direction every tick as player moves', async () => {
    const { engine, physics, PhysicsCombinedForce, Transform } = setup()
    const src = engine.addEntity()

    // Player at (10, 0, 0) -> push in +X
    Transform.createOrReplace(engine.PlayerEntity, { position: { x: 10, y: 0, z: 0 } })

    await engine.update(1)
    physics.applyRepulsionForceToPlayer(src, { x: 0, y: 0, z: 0 }, 5)

    let force = PhysicsCombinedForce.get(engine.PlayerEntity)
    expect(force.vector!.x).toBeCloseTo(5, 5)
    expect(force.vector!.z).toBeCloseTo(0, 5)

    // Player moves to (0, 0, 10) -> push in +Z
    Transform.createOrReplace(engine.PlayerEntity, { position: { x: 0, y: 0, z: 10 } })
    await engine.update(1)

    force = PhysicsCombinedForce.get(engine.PlayerEntity)
    expect(force.vector!.x).toBeCloseTo(0, 5)
    expect(force.vector!.z).toBeCloseTo(5, 5)
  })

  it('no force when player is outside radius', async () => {
    const { engine, physics, PhysicsCombinedForce } = setup()
    const src = engine.addEntity()

    await engine.update(1)
    // Player at origin, source at (20, 0, 0), radius=5 -> distance=20 > 5
    physics.applyRepulsionForceToPlayer(src, { x: 20, y: 0, z: 0 }, 10, 5)

    expect(PhysicsCombinedForce.getOrNull(engine.PlayerEntity)).toBeNull()
  })

  it('linear falloff decreases with distance', async () => {
    const { engine, physics, PhysicsCombinedForce, Transform } = setup()
    const src = engine.addEntity()

    // Player at (5, 0, 0), source at origin, distance=5, radius=10
    // Linear: 50 * (1 - 5/10) = 25
    Transform.createOrReplace(engine.PlayerEntity, { position: { x: 5, y: 0, z: 0 } })

    await engine.update(1)
    physics.applyRepulsionForceToPlayer(src, { x: 0, y: 0, z: 0 }, 50, 10, KnockbackFalloff.LINEAR)

    const force = PhysicsCombinedForce.get(engine.PlayerEntity)
    const mag = Math.sqrt(force.vector!.x ** 2 + force.vector!.y ** 2 + force.vector!.z ** 2)
    expect(mag).toBeCloseTo(25, 5)
    expect(force.vector!.x).toBeCloseTo(25, 5)
  })

  it('inverse square falloff drops sharply', async () => {
    const { engine, physics, PhysicsCombinedForce, Transform } = setup()
    const src = engine.addEntity()

    // Player at (3, 0, 0), source at origin, distance=3
    // InverseSquare: 100 / (9 + 1) = 10
    Transform.createOrReplace(engine.PlayerEntity, { position: { x: 3, y: 0, z: 0 } })

    await engine.update(1)
    physics.applyRepulsionForceToPlayer(src, { x: 0, y: 0, z: 0 }, 100, 20, KnockbackFalloff.INVERSE_SQUARE)

    const force = PhysicsCombinedForce.get(engine.PlayerEntity)
    const mag = Math.sqrt(force.vector!.x ** 2 + force.vector!.y ** 2 + force.vector!.z ** 2)
    expect(mag).toBeCloseTo(10, 5)
  })

  it('negative magnitude attracts toward source', async () => {
    const { engine, physics, PhysicsCombinedForce, Transform } = setup()
    const src = engine.addEntity()

    // Player at (10, 0, 0), source at origin -> diff = (10, 0, 0)
    // magnitude = -20 -> vector = normalize(10,0,0) * -20 = (-20, 0, 0)
    Transform.createOrReplace(engine.PlayerEntity, { position: { x: 10, y: 0, z: 0 } })

    await engine.update(1)
    physics.applyRepulsionForceToPlayer(src, { x: 0, y: 0, z: 0 }, -20)

    const force = PhysicsCombinedForce.get(engine.PlayerEntity)
    expect(force.vector!.x).toBeCloseTo(-20, 5)
    expect(force.vector!.y).toBeCloseTo(0, 5)
  })

  it('coexist with regular force from another source', async () => {
    const { engine, physics, PhysicsCombinedForce } = setup()
    const repulsionSrc = engine.addEntity()
    const windSrc = engine.addEntity()

    await engine.update(1)
    physics.applyForceToPlayer(windSrc, { x: 0, y: 0, z: 10 })
    physics.applyRepulsionForceToPlayer(repulsionSrc, { x: -5, y: 0, z: 0 }, 20)

    // Repulsion: push +X (20), wind: push +Z (10) -> sum (20, 0, 10)
    const force = PhysicsCombinedForce.get(engine.PlayerEntity)
    expect(force.vector!.x).toBeCloseTo(20, 5)
    expect(force.vector!.y).toBeCloseTo(0, 5)
    expect(force.vector!.z).toBeCloseTo(10, 5)
  })

  it('remove repulsion with removeForceFromPlayer', async () => {
    const { engine, physics, PhysicsCombinedForce } = setup()
    const src = engine.addEntity()

    await engine.update(1)
    physics.applyRepulsionForceToPlayer(src, { x: -5, y: 0, z: 0 }, 20)
    expect(PhysicsCombinedForce.getOrNull(engine.PlayerEntity)).not.toBeNull()

    physics.removeForceFromPlayer(src)
    expect(PhysicsCombinedForce.getOrNull(engine.PlayerEntity)).toBeNull()

    // Background system should not re-add it
    await engine.update(1)
    expect(PhysicsCombinedForce.getOrNull(engine.PlayerEntity)).toBeNull()
  })

  it('stop updating after removal even as player moves', async () => {
    const { engine, physics, PhysicsCombinedForce, Transform } = setup()
    const src = engine.addEntity()

    await engine.update(1)
    physics.applyRepulsionForceToPlayer(src, { x: -5, y: 0, z: 0 }, 20)
    physics.removeForceFromPlayer(src)

    // Move player — repulsion should not come back
    Transform.createOrReplace(engine.PlayerEntity, { position: { x: 3, y: 0, z: 0 } })
    await engine.update(1)
    expect(PhysicsCombinedForce.getOrNull(engine.PlayerEntity)).toBeNull()
  })
})
