import { Engine, Entity, components } from '../../../packages/@dcl/ecs/src'
import { Quaternion, Vector3 } from '../../../packages/@dcl/sdk/src/math'
import { TRANSFORM_LENGTH } from '../../../packages/@dcl/ecs/src/components/manual/Transform'
import { ReadWriteByteBuffer } from '../../../packages/@dcl/ecs/src/serialization/ByteBuffer'
import { testComponentSerialization } from './assertion'

describe('Transform component', () => {
  it('should transform length 44 bytes ', () => {
    expect(TRANSFORM_LENGTH).toBe(44)
  })

  it('should serialize Transform with 44 bytes', () => {
    const newEngine = Engine()
    const Transform = components.Transform(newEngine)

    const buffer = new ReadWriteByteBuffer()
    Transform.schema.serialize(
      {
        position: Vector3.create(Math.PI, Math.LN10, Math.SQRT1_2),
        rotation: Quaternion.create(Math.PI, Math.E, 0.0, Math.SQRT1_2),
        scale: Vector3.create(Math.PI, Math.E, Math.LN10),
        parent: 123456789 as Entity
      },
      buffer
    )

    expect(Array.from(buffer.toBinary())).toStrictEqual([
      64, 73, 15, 219, 64, 19, 93, 142, 63, 53, 4, 243, 64, 73, 15, 219, 64, 45, 248, 84, 0, 0, 0, 0, 63, 53, 4, 243,
      64, 73, 15, 219, 64, 45, 248, 84, 64, 19, 93, 142, 7, 91, 205, 21
    ])
    expect(buffer.toBinary().length).toBe(TRANSFORM_LENGTH)
  })

  it('should serialize/deserialize Transform', () => {
    const newEngine = Engine()
    const Transform = components.Transform(newEngine)

    testComponentSerialization(Transform, {
      position: Vector3.create(Math.PI, Math.LN10, Math.SQRT1_2),
      rotation: Quaternion.create(Math.PI, Math.E, 0.0, Math.SQRT1_2),
      scale: Vector3.create(Math.PI, Math.E, Math.LN10),
      parent: 123456789 as Entity
    })

    testComponentSerialization(Transform, {
      position: Vector3.One(),
      rotation: Quaternion.Identity(),
      scale: Vector3.Zero(),
      parent: 3333 as Entity
    })
  })

  it('should serialize/deserialize Transform without parent', () => {
    const newEngine = Engine()
    const Transform = components.Transform(newEngine)

    testComponentSerialization(Transform, {
      position: Vector3.create(Math.PI, Math.LN10, Math.SQRT1_2),
      rotation: Quaternion.create(Math.PI, Math.E, 0.0, Math.SQRT1_2),
      scale: Vector3.create(Math.PI, Math.E, Math.LN10)
    })

    testComponentSerialization(Transform, {
      position: Vector3.One(),
      rotation: Quaternion.Identity(),
      scale: Vector3.Zero(),
      parent: 3333 as Entity
    })
  })

  it('should create a valid empty transform component if no value argument is passed', () => {
    const newEngine = Engine()
    const Transform = components.Transform(newEngine)
    const entity = newEngine.addEntity()

    const t1 = Transform.create(entity)

    expect(t1).toEqual({
      position: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      parent: 0 as Entity
    })
  })

  it('should create a valid empty transform component if no value argument is passed in getOrCreate', () => {
    const newEngine = Engine()
    const Transform = components.Transform(newEngine)
    const entity = newEngine.addEntity()

    Transform.create(entity, {
      position: Vector3.One(),
      rotation: Quaternion.Identity(),
      scale: Vector3.Down(),
      parent: 3333 as Entity
    })

    const t1 = Transform.createOrReplace(entity)

    expect(t1).toEqual({
      position: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      parent: 0
    })
  })
})
