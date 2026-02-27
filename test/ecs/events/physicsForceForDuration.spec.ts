import {
  components,
  createPhysicsSystem,
  Engine,
  IEngine,
  PhysicsSystem
} from '../../../packages/@dcl/ecs/src'

describe('Physics applyForceToPlayerForDuration should', () => {
  function setup() {
    const engine: IEngine = Engine()
    const physics: PhysicsSystem = createPhysicsSystem(engine)
    const PhysicsCombinedForce = components.PhysicsCombinedForce(engine)
    return { engine, physics, PhysicsCombinedForce }
  }

  it('apply force and auto-remove after duration expires', async () => {
    const { engine, physics, PhysicsCombinedForce } = setup()
    const src = engine.addEntity()

    await engine.update(1)
    physics.applyForceToPlayerForDuration(src, 2, { x: 10, y: 0, z: 0 })

    const force = PhysicsCombinedForce.get(engine.PlayerEntity)
    expect(force.vector).toEqual({ x: 10, y: 0, z: 0 })

    // 1 second later — still active
    await engine.update(1)
    expect(PhysicsCombinedForce.getOrNull(engine.PlayerEntity)?.vector).toEqual({ x: 10, y: 0, z: 0 })

    // 1 more second (total 2s) — timer fires, force removed
    await engine.update(1)
    expect(PhysicsCombinedForce.getOrNull(engine.PlayerEntity)).toBeNull()
  })

  it('use direction + magnitude overload', async () => {
    const { engine, physics, PhysicsCombinedForce } = setup()
    const src = engine.addEntity()

    await engine.update(1)
    physics.applyForceToPlayerForDuration(src, 1, { x: 3, y: 0, z: 4 }, 10)

    const force = PhysicsCombinedForce.get(engine.PlayerEntity)
    expect(force.vector!.x).toBeCloseTo(6)
    expect(force.vector!.y).toBeCloseTo(0)
    expect(force.vector!.z).toBeCloseTo(8)

    // After 1 second, force removed
    await engine.update(1)
    expect(PhysicsCombinedForce.getOrNull(engine.PlayerEntity)).toBeNull()
  })

  it('reset timer when called again with same source', async () => {
    const { engine, physics, PhysicsCombinedForce } = setup()
    const src = engine.addEntity()

    await engine.update(1)
    physics.applyForceToPlayerForDuration(src, 2, { x: 10, y: 0, z: 0 })

    // Advance 1.5s
    await engine.update(1.5)
    expect(PhysicsCombinedForce.getOrNull(engine.PlayerEntity)?.vector).toEqual({ x: 10, y: 0, z: 0 })

    // Re-apply with new vector and reset timer to 2s from now
    physics.applyForceToPlayerForDuration(src, 2, { x: 0, y: 5, z: 0 })
    expect(PhysicsCombinedForce.get(engine.PlayerEntity).vector).toEqual({ x: 0, y: 5, z: 0 })

    // 1.5s later — old timer would have expired but new timer still active
    await engine.update(1.5)
    expect(PhysicsCombinedForce.getOrNull(engine.PlayerEntity)?.vector).toEqual({ x: 0, y: 5, z: 0 })

    // 0.5s more (total 2s from reset) — now removed
    await engine.update(0.5)
    expect(PhysicsCombinedForce.getOrNull(engine.PlayerEntity)).toBeNull()
  })

  it('coexist with a regular force from another source', async () => {
    const { engine, physics, PhysicsCombinedForce } = setup()
    const srcTimed = engine.addEntity()
    const srcPermanent = engine.addEntity()

    await engine.update(1)
    physics.applyForceToPlayer(srcPermanent, { x: 0, y: 10, z: 0 })
    physics.applyForceToPlayerForDuration(srcTimed, 1, { x: 5, y: 0, z: 0 })

    // Both active — summed
    expect(PhysicsCombinedForce.get(engine.PlayerEntity).vector).toEqual({ x: 5, y: 10, z: 0 })

    // After 1s the timed force expires, permanent remains
    await engine.update(1)
    expect(PhysicsCombinedForce.get(engine.PlayerEntity).vector).toEqual({ x: 0, y: 10, z: 0 })
  })

  it('remove force immediately if duration is 0', async () => {
    const { engine, physics, PhysicsCombinedForce } = setup()
    const src = engine.addEntity()

    await engine.update(1)
    physics.applyForceToPlayerForDuration(src, 0, { x: 10, y: 0, z: 0 })

    // Force applied but timer fires on next tick (dt=0 would match immediately)
    await engine.update(0)
    expect(PhysicsCombinedForce.getOrNull(engine.PlayerEntity)).toBeNull()
  })
})
