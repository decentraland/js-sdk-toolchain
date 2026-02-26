import { components, Engine, IEngine } from '../../packages/@dcl/ecs/src'
import { TransformComponentExtended } from '../../packages/@dcl/ecs/src/components/manual/Transform'

describe('Transform.localToWorldDirection', () => {
  function setup() {
    const engine: IEngine = Engine()
    const Transform: TransformComponentExtended = components.Transform(engine)
    return { engine, Transform }
  }

  it('should return unchanged direction for entity with identity rotation', () => {
    const { engine, Transform } = setup()
    const entity = engine.addEntity()
    Transform.create(entity)

    const dir = Transform.localToWorldDirection(entity, { x: 0, y: 0, z: 10 })
    expect(dir.x).toBeCloseTo(0, 5)
    expect(dir.y).toBeCloseTo(0, 5)
    expect(dir.z).toBeCloseTo(10, 5)
  })

  it('should rotate direction by entity rotation (90deg Y)', () => {
    const { engine, Transform } = setup()
    const entity = engine.addEntity()
    // 90deg around Y: local Z -> world X
    Transform.create(entity, {
      rotation: { x: 0, y: Math.SQRT1_2, z: 0, w: Math.SQRT1_2 }
    })

    const dir = Transform.localToWorldDirection(entity, { x: 0, y: 0, z: 1 })
    expect(dir.x).toBeCloseTo(1, 5)
    expect(dir.y).toBeCloseTo(0, 5)
    expect(dir.z).toBeCloseTo(0, 5)
  })

  it('should preserve vector magnitude', () => {
    const { engine, Transform } = setup()
    const entity = engine.addEntity()
    Transform.create(entity, {
      rotation: { x: 0, y: Math.SQRT1_2, z: 0, w: Math.SQRT1_2 }
    })

    const dir = Transform.localToWorldDirection(entity, { x: 0, y: 0, z: 25 })
    const magnitude = Math.sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z)
    expect(magnitude).toBeCloseTo(25, 5)
  })

  it('should account for full parent hierarchy', () => {
    const { engine, Transform } = setup()

    // Parent: 90deg around Y
    const parent = engine.addEntity()
    Transform.create(parent, {
      rotation: { x: 0, y: Math.SQRT1_2, z: 0, w: Math.SQRT1_2 }
    })

    // Child: another 90deg around Y -> total 180deg around Y
    const child = engine.addEntity()
    Transform.create(child, {
      rotation: { x: 0, y: Math.SQRT1_2, z: 0, w: Math.SQRT1_2 },
      parent
    })

    // Local forward (0, 0, 1) through 180deg Y -> world (0, 0, -1)
    const dir = Transform.localToWorldDirection(child, { x: 0, y: 0, z: 1 })
    expect(dir.x).toBeCloseTo(0, 5)
    expect(dir.y).toBeCloseTo(0, 5)
    expect(dir.z).toBeCloseTo(-1, 5)
  })

  it('should not be affected by entity position (direction only)', () => {
    const { engine, Transform } = setup()
    const entity = engine.addEntity()
    Transform.create(entity, {
      position: { x: 100, y: 200, z: 300 },
      rotation: { x: 0, y: Math.SQRT1_2, z: 0, w: Math.SQRT1_2 }
    })

    const dir = Transform.localToWorldDirection(entity, { x: 0, y: 0, z: 1 })
    expect(dir.x).toBeCloseTo(1, 5)
    expect(dir.y).toBeCloseTo(0, 5)
    expect(dir.z).toBeCloseTo(0, 5)
  })

  it('should not be affected by entity scale (direction only)', () => {
    const { engine, Transform } = setup()
    const entity = engine.addEntity()
    Transform.create(entity, {
      scale: { x: 5, y: 5, z: 5 },
      rotation: { x: 0, y: Math.SQRT1_2, z: 0, w: Math.SQRT1_2 }
    })

    const dir = Transform.localToWorldDirection(entity, { x: 0, y: 0, z: 1 })
    expect(dir.x).toBeCloseTo(1, 5)
    expect(dir.y).toBeCloseTo(0, 5)
    expect(dir.z).toBeCloseTo(0, 5)
  })

  it('should handle entity without Transform (identity rotation)', () => {
    const { engine, Transform } = setup()
    const entity = engine.addEntity()

    const dir = Transform.localToWorldDirection(entity, { x: 3, y: 4, z: 5 })
    expect(dir.x).toBeCloseTo(3, 5)
    expect(dir.y).toBeCloseTo(4, 5)
    expect(dir.z).toBeCloseTo(5, 5)
  })

  it('pendulum use case: rotated source entity pushing in local forward', () => {
    const { engine, Transform } = setup()

    // Pivot entity rotated 45deg around Y
    const halfAngle = Math.PI / 8 // half of 45deg
    const pivot = engine.addEntity()
    Transform.create(pivot, {
      rotation: {
        x: 0,
        y: Math.sin(halfAngle),
        z: 0,
        w: Math.cos(halfAngle)
      }
    })

    // Local normal = forward (0, 0, 1), should become rotated by 45deg in XZ plane
    const worldNormal = Transform.localToWorldDirection(pivot, { x: 0, y: 0, z: 1 })
    expect(worldNormal.x).toBeCloseTo(Math.SQRT1_2, 4)
    expect(worldNormal.y).toBeCloseTo(0, 5)
    expect(worldNormal.z).toBeCloseTo(Math.SQRT1_2, 4)
  })

  it('three-level hierarchy with mixed rotations', () => {
    const { engine, Transform } = setup()

    // Grandparent: 90deg around Y
    const grandparent = engine.addEntity()
    Transform.create(grandparent, {
      rotation: { x: 0, y: Math.SQRT1_2, z: 0, w: Math.SQRT1_2 }
    })

    // Parent: 90deg around X (in grandparent's local space)
    const parent = engine.addEntity()
    Transform.create(parent, {
      rotation: { x: Math.SQRT1_2, y: 0, z: 0, w: Math.SQRT1_2 },
      parent: grandparent
    })

    // Child: identity rotation
    const child = engine.addEntity()
    Transform.create(child, { parent })

    // Local up (0, 1, 0) through combined rotation
    const dir = Transform.localToWorldDirection(child, { x: 0, y: 1, z: 0 })
    // Combined rotation: first 90X (Y->Z), then 90Y (Z->X) => (0,1,0) -> (1,0,0)
    expect(dir.x).toBeCloseTo(1, 4)
    expect(dir.y).toBeCloseTo(0, 4)
    expect(dir.z).toBeCloseTo(0, 4)
  })
})
