import { Quaternion, Vector3 } from '@dcl/ecs-math'
import { TRANSFORM_LENGTH } from '../../src/components/legacy/Transform'
import { Engine } from '../../src/engine'
import { Entity } from '../../src/engine/entity'

describe('Transform component', () => {
  it('should transform length 44 bytes ', () => {
    expect(TRANSFORM_LENGTH).toBe(44)
  })

  it('should serialize Transform with 44 bytes', () => {
    const newEngine = Engine()
    const { Transform } = newEngine.baseComponents
    const entity = newEngine.addEntity()

    Transform.create(entity, {
      position: Vector3.create(Math.PI, Math.LN10, Math.SQRT1_2),
      rotation: Quaternion.create(Math.PI, Math.E, 0.0, Math.SQRT1_2),
      scale: Vector3.create(Math.PI, Math.E, Math.LN10),
      parent: 123456789 as Entity
    })

    const buffer = Transform.toBinary(entity)
    expect(Array.from(buffer.toBinary())).toStrictEqual([
      64, 73, 15, 219, 64, 19, 93, 142, 63, 53, 4, 243, 64, 73, 15, 219, 64, 45,
      248, 84, 0, 0, 0, 0, 63, 53, 4, 243, 64, 73, 15, 219, 64, 45, 248, 84, 64,
      19, 93, 142, 7, 91, 205, 21
    ])
    expect(buffer.toBinary().length).toBe(TRANSFORM_LENGTH)
  })

  it('should serialize/deserialize Transform', () => {
    const newEngine = Engine()
    const { Transform } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()

    const t1 = Transform.create(entity, {
      position: Vector3.create(Math.PI, Math.LN10, Math.SQRT1_2),
      rotation: Quaternion.create(Math.PI, Math.E, 0.0, Math.SQRT1_2),
      scale: Vector3.create(Math.PI, Math.E, Math.LN10),
      parent: 123456789 as Entity
    })

    Transform.create(entityB, {
      position: Vector3.One(),
      rotation: Quaternion.Identity(),
      scale: Vector3.Zero(),
      parent: 3333 as Entity
    })

    const buffer = Transform.toBinary(entity)
    Transform.updateFromBinary(entityB, buffer)

    expect(t1).toBeDeepCloseTo(Transform.getFrom(entityB) as any)
  })

  it('should serialize/deserialize Transform without parent', () => {
    const newEngine = Engine()
    const { Transform } = newEngine.baseComponents
    const entity = newEngine.addEntity()
    const entityB = newEngine.addEntity()

    const t1 = Transform.create(entity, {
      position: Vector3.create(Math.PI, Math.LN10, Math.SQRT1_2),
      rotation: Quaternion.create(Math.PI, Math.E, 0.0, Math.SQRT1_2),
      scale: Vector3.create(Math.PI, Math.E, Math.LN10)
    })

    Transform.create(entityB, {
      position: Vector3.One(),
      rotation: Quaternion.Identity(),
      scale: Vector3.Zero(),
      parent: 3333 as Entity
    })

    const buffer = Transform.toBinary(entity)
    Transform.updateFromBinary(entityB, buffer)

    expect({ ...t1, parent: 0 }).toBeDeepCloseTo(
      Transform.getFrom(entityB) as any
    )
    // optional parent serialize as 0
    expect(Transform.getFrom(entityB).parent).toBe(0)
  })
})
