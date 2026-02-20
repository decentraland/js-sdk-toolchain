import {
  components,
  createPhysicsSystem,
  Engine,
  IEngine,
  PhysicsSystem,
  PhysicsForceSpace
} from '../../../packages/@dcl/ecs/src'

describe('Physics impulse helper system should', () => {
  function setup() {
    const engine: IEngine = Engine()
    const physics: PhysicsSystem = createPhysicsSystem(engine)
    const PhysicsImpulse = components.PhysicsImpulse(engine)
    const Transform = components.Transform(engine)
    return { engine, physics, PhysicsImpulse, Transform }
  }

  it('apply a single impulse with correct direction and timestamp', async () => {
    const { engine, physics, PhysicsImpulse } = setup()

    await engine.update(1)
    physics.applyImpulseToPlayer({ x: 0, y: 15, z: 0 })

    const impulse = PhysicsImpulse.get(engine.PlayerEntity)
    expect(impulse.direction).toEqual({ x: 0, y: 15, z: 0 })
    expect(impulse.timestamp).toBe(1)
  })

  it('accumulate two impulses in the same frame', async () => {
    const { engine, physics, PhysicsImpulse } = setup()

    await engine.update(1)
    physics.applyImpulseToPlayer({ x: 10, y: 0, z: 0 })
    physics.applyImpulseToPlayer({ x: 0, y: 5, z: 0 })

    const impulse = PhysicsImpulse.get(engine.PlayerEntity)
    expect(impulse.direction).toEqual({ x: 10, y: 5, z: 0 })
    expect(impulse.timestamp).toBe(1)
  })

  it('accumulate three impulses in the same frame', async () => {
    const { engine, physics, PhysicsImpulse } = setup()

    await engine.update(1)
    physics.applyImpulseToPlayer({ x: 1, y: 0, z: 0 })
    physics.applyImpulseToPlayer({ x: 0, y: 2, z: 0 })
    physics.applyImpulseToPlayer({ x: 0, y: 0, z: 3 })

    const impulse = PhysicsImpulse.get(engine.PlayerEntity)
    expect(impulse.direction).toEqual({ x: 1, y: 2, z: 3 })
    expect(impulse.timestamp).toBe(1)
  })

  it('use different timestamps for impulses on different frames', async () => {
    const { engine, physics, PhysicsImpulse } = setup()

    await engine.update(1)
    physics.applyImpulseToPlayer({ x: 10, y: 0, z: 0 })

    const first = PhysicsImpulse.get(engine.PlayerEntity)
    expect(first.timestamp).toBe(1)

    await engine.update(1)
    physics.applyImpulseToPlayer({ x: 0, y: 5, z: 0 })

    const second = PhysicsImpulse.get(engine.PlayerEntity)
    expect(second.direction).toEqual({ x: 0, y: 5, z: 0 })
    expect(second.timestamp).toBe(2)
  })

  it('apply impulse with direction and magnitude overload', async () => {
    const { engine, physics, PhysicsImpulse } = setup()

    await engine.update(1)
    physics.applyImpulseToPlayer({ x: 0, y: 1, z: 0 }, 20)

    const impulse = PhysicsImpulse.get(engine.PlayerEntity)
    expect(impulse.direction!.x).toBeCloseTo(0)
    expect(impulse.direction!.y).toBeCloseTo(20)
    expect(impulse.direction!.z).toBeCloseTo(0)
    expect(impulse.timestamp).toBe(1)
  })

  it('normalize non-unit direction in magnitude overload', async () => {
    const { engine, physics, PhysicsImpulse } = setup()

    await engine.update(1)
    physics.applyImpulseToPlayer({ x: 3, y: 0, z: 4 }, 10)

    const impulse = PhysicsImpulse.get(engine.PlayerEntity)
    expect(impulse.direction!.x).toBeCloseTo(6)
    expect(impulse.direction!.y).toBeCloseTo(0)
    expect(impulse.direction!.z).toBeCloseTo(8)
  })

  it('skip zero vector (no-op)', async () => {
    const { engine, physics, PhysicsImpulse } = setup()

    await engine.update(1)
    physics.applyImpulseToPlayer({ x: 0, y: 0, z: 0 })

    expect(PhysicsImpulse.getOrNull(engine.PlayerEntity)).toBeNull()
  })

  it('skip zero direction in magnitude overload', async () => {
    const { engine, physics, PhysicsImpulse } = setup()

    await engine.update(1)
    physics.applyImpulseToPlayer({ x: 0, y: 0, z: 0 }, 10)

    expect(PhysicsImpulse.getOrNull(engine.PlayerEntity)).toBeNull()
  })

  it('convert LOCAL space to WORLD space using player rotation', async () => {
    const { engine, physics, PhysicsImpulse, Transform } = setup()

    // Rotate player 90 degrees around Y axis.
    // sin(45deg) ≈ 0.7071, cos(45deg) ≈ 0.7071
    // Quaternion for 90 deg Y: (0, sin(45), 0, cos(45))
    Transform.create(engine.PlayerEntity, {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: Math.SQRT1_2, z: 0, w: Math.SQRT1_2 },
      scale: { x: 1, y: 1, z: 1 }
    })

    await engine.update(1)
    // LOCAL forward (0,0,1) should become WORLD right-ish (1,0,0) after 90deg Y rotation
    physics.applyImpulseToPlayer({ x: 0, y: 0, z: 10 }, PhysicsForceSpace.PFS_LOCAL)

    const impulse = PhysicsImpulse.get(engine.PlayerEntity)
    expect(impulse.direction!.x).toBeCloseTo(10)
    expect(impulse.direction!.y).toBeCloseTo(0)
    expect(impulse.direction!.z).toBeCloseTo(0)
  })

  it('accumulate mixed LOCAL and WORLD impulses in the same frame', async () => {
    const { engine, physics, PhysicsImpulse, Transform } = setup()

    // Rotate player 90 degrees around Y axis
    Transform.create(engine.PlayerEntity, {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: Math.SQRT1_2, z: 0, w: Math.SQRT1_2 },
      scale: { x: 1, y: 1, z: 1 }
    })

    await engine.update(1)

    // WORLD up: (0, 5, 0)
    physics.applyImpulseToPlayer({ x: 0, y: 5, z: 0 }, PhysicsForceSpace.PFS_WORLD)
    // LOCAL forward (0,0,10) -> after 90deg Y rotation -> WORLD (10,0,0)
    physics.applyImpulseToPlayer({ x: 0, y: 0, z: 10 }, PhysicsForceSpace.PFS_LOCAL)

    const impulse = PhysicsImpulse.get(engine.PlayerEntity)
    expect(impulse.direction!.x).toBeCloseTo(10)
    expect(impulse.direction!.y).toBeCloseTo(5)
    expect(impulse.direction!.z).toBeCloseTo(0)
    expect(impulse.timestamp).toBe(1)
  })

  it('throw error when component is modified externally', async () => {
    const { engine, physics, PhysicsImpulse } = setup()

    await engine.update(1)
    physics.applyImpulseToPlayer({ x: 1, y: 0, z: 0 })

    // Externally modify the component with a different timestamp
    PhysicsImpulse.createOrReplace(engine.PlayerEntity, {
      direction: { x: 99, y: 0, z: 0 },
      timestamp: 999
    })

    expect(() => {
      physics.applyImpulseToPlayer({ x: 0, y: 1, z: 0 })
    }).toThrow(/modified outside Physics helper/)
  })

  it('not throw on first call (no prior state)', async () => {
    const { engine, physics } = setup()

    await engine.update(1)
    expect(() => {
      physics.applyImpulseToPlayer({ x: 5, y: 0, z: 0 })
    }).not.toThrow()
  })

  it('correctly reset accumulation across frame boundaries', async () => {
    const { engine, physics, PhysicsImpulse } = setup()

    // Frame 1: two impulses -> accumulated
    await engine.update(1)
    physics.applyImpulseToPlayer({ x: 10, y: 0, z: 0 })
    physics.applyImpulseToPlayer({ x: 0, y: 10, z: 0 })

    const frame1 = PhysicsImpulse.get(engine.PlayerEntity)
    expect(frame1.direction).toEqual({ x: 10, y: 10, z: 0 })

    // Frame 2: single impulse -> NOT accumulated with frame 1
    await engine.update(1)
    physics.applyImpulseToPlayer({ x: 0, y: 0, z: 7 })

    const frame2 = PhysicsImpulse.get(engine.PlayerEntity)
    expect(frame2.direction).toEqual({ x: 0, y: 0, z: 7 })
    expect(frame2.timestamp).toBe(2)
  })

  it('work with direction + magnitude + LOCAL space overload', async () => {
    const { engine, physics, PhysicsImpulse, Transform } = setup()

    // Rotate player 90 degrees around Y axis
    Transform.create(engine.PlayerEntity, {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: Math.SQRT1_2, z: 0, w: Math.SQRT1_2 },
      scale: { x: 1, y: 1, z: 1 }
    })

    await engine.update(1)
    // LOCAL forward (0,0,1) * magnitude 20 -> WORLD (20,0,0) after 90deg Y
    physics.applyImpulseToPlayer({ x: 0, y: 0, z: 1 }, 20, PhysicsForceSpace.PFS_LOCAL)

    const impulse = PhysicsImpulse.get(engine.PlayerEntity)
    expect(impulse.direction!.x).toBeCloseTo(20)
    expect(impulse.direction!.y).toBeCloseTo(0)
    expect(impulse.direction!.z).toBeCloseTo(0)
  })
})
