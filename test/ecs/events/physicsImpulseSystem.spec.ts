import {
  components,
  createPhysicsSystem,
  Engine,
  IEngine,
  PhysicsSystem
} from '../../../packages/@dcl/ecs/src'

describe('Physics impulse helper system should', () => {
  function setup() {
    const engine: IEngine = Engine()
    const physics: PhysicsSystem = createPhysicsSystem(engine)
    const PhysicsCombinedImpulse = components.PhysicsCombinedImpulse(engine)
    const EngineInfo = components.EngineInfo(engine)

    let tickNumber = 0
    async function tick(dt = 1) {
      EngineInfo.createOrReplace(engine.RootEntity, { tickNumber: ++tickNumber, frameNumber: tickNumber, totalRuntime: 0 })
      await engine.update(dt)
    }

    return { engine, physics, PhysicsCombinedImpulse, tick }
  }

  it('apply a single impulse with correct vector and eventId', async () => {
    const { engine, physics, PhysicsCombinedImpulse, tick } = setup()

    await tick()
    physics.applyImpulseToPlayer({ x: 0, y: 15, z: 0 })

    const impulse = PhysicsCombinedImpulse.get(engine.PlayerEntity)
    expect(impulse.vector).toEqual({ x: 0, y: 15, z: 0 })
    expect(impulse.eventId).toBe(1)
  })

  it('accumulate two impulses in the same frame', async () => {
    const { engine, physics, PhysicsCombinedImpulse, tick } = setup()

    await tick()
    physics.applyImpulseToPlayer({ x: 10, y: 0, z: 0 })
    physics.applyImpulseToPlayer({ x: 0, y: 5, z: 0 })

    const impulse = PhysicsCombinedImpulse.get(engine.PlayerEntity)
    expect(impulse.vector).toEqual({ x: 10, y: 5, z: 0 })
    expect(impulse.eventId).toBe(1)
  })

  it('accumulate three impulses in the same frame', async () => {
    const { engine, physics, PhysicsCombinedImpulse, tick } = setup()

    await tick()
    physics.applyImpulseToPlayer({ x: 1, y: 0, z: 0 })
    physics.applyImpulseToPlayer({ x: 0, y: 2, z: 0 })
    physics.applyImpulseToPlayer({ x: 0, y: 0, z: 3 })

    const impulse = PhysicsCombinedImpulse.get(engine.PlayerEntity)
    expect(impulse.vector).toEqual({ x: 1, y: 2, z: 3 })
    expect(impulse.eventId).toBe(1)
  })

  it('use different eventIds for impulses on different frames', async () => {
    const { engine, physics, PhysicsCombinedImpulse, tick } = setup()

    await tick()
    physics.applyImpulseToPlayer({ x: 10, y: 0, z: 0 })

    const first = PhysicsCombinedImpulse.get(engine.PlayerEntity)
    expect(first.eventId).toBe(1)

    await tick()
    physics.applyImpulseToPlayer({ x: 0, y: 5, z: 0 })

    const second = PhysicsCombinedImpulse.get(engine.PlayerEntity)
    expect(second.vector).toEqual({ x: 0, y: 5, z: 0 })
    expect(second.eventId).toBe(2)
  })

  it('apply impulse with vector and magnitude overload', async () => {
    const { engine, physics, PhysicsCombinedImpulse, tick } = setup()

    await tick()
    physics.applyImpulseToPlayer({ x: 0, y: 1, z: 0 }, 20)

    const impulse = PhysicsCombinedImpulse.get(engine.PlayerEntity)
    expect(impulse.vector!.x).toBeCloseTo(0)
    expect(impulse.vector!.y).toBeCloseTo(20)
    expect(impulse.vector!.z).toBeCloseTo(0)
    expect(impulse.eventId).toBe(1)
  })

  it('normalize non-unit vector in magnitude overload', async () => {
    const { engine, physics, PhysicsCombinedImpulse, tick } = setup()

    await tick()
    physics.applyImpulseToPlayer({ x: 3, y: 0, z: 4 }, 10)

    const impulse = PhysicsCombinedImpulse.get(engine.PlayerEntity)
    expect(impulse.vector!.x).toBeCloseTo(6)
    expect(impulse.vector!.y).toBeCloseTo(0)
    expect(impulse.vector!.z).toBeCloseTo(8)
  })

  it('skip zero vector (no-op)', async () => {
    const { engine, physics, PhysicsCombinedImpulse, tick } = setup()

    await tick()
    physics.applyImpulseToPlayer({ x: 0, y: 0, z: 0 })

    expect(PhysicsCombinedImpulse.getOrNull(engine.PlayerEntity)).toBeNull()
  })

  it('skip zero vector in magnitude overload (no-op)', async () => {
    const { engine, physics, PhysicsCombinedImpulse, tick } = setup()

    await tick()
    physics.applyImpulseToPlayer({ x: 0, y: 0, z: 0 }, 10)

    expect(PhysicsCombinedImpulse.getOrNull(engine.PlayerEntity)).toBeNull()
  })

  it('throw error when component is modified externally', async () => {
    const { engine, physics, PhysicsCombinedImpulse, tick } = setup()

    await tick()
    physics.applyImpulseToPlayer({ x: 1, y: 0, z: 0 })

    PhysicsCombinedImpulse.createOrReplace(engine.PlayerEntity, {
      vector: { x: 99, y: 0, z: 0 },
      eventId: 999
    })

    expect(() => {
      physics.applyImpulseToPlayer({ x: 0, y: 1, z: 0 })
    }).toThrow(/modified outside Physics helper/)
  })

  it('not throw on first call (no prior state)', async () => {
    const { engine, physics, tick } = setup()

    await tick()
    expect(() => {
      physics.applyImpulseToPlayer({ x: 5, y: 0, z: 0 })
    }).not.toThrow()
  })

  it('correctly reset accumulation across frame boundaries', async () => {
    const { engine, physics, PhysicsCombinedImpulse, tick } = setup()

    // Frame 1: two impulses -> accumulated
    await tick()
    physics.applyImpulseToPlayer({ x: 10, y: 0, z: 0 })
    physics.applyImpulseToPlayer({ x: 0, y: 10, z: 0 })

    const frame1 = PhysicsCombinedImpulse.get(engine.PlayerEntity)
    expect(frame1.vector).toEqual({ x: 10, y: 10, z: 0 })

    // Frame 2: single impulse -> NOT accumulated with frame 1
    await tick()
    physics.applyImpulseToPlayer({ x: 0, y: 0, z: 7 })

    const frame2 = PhysicsCombinedImpulse.get(engine.PlayerEntity)
    expect(frame2.vector).toEqual({ x: 0, y: 0, z: 7 })
    expect(frame2.eventId).toBe(2)
  })
})
