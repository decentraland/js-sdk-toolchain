import { Engine, Entity, components } from '../../../packages/@dcl/ecs/src'
import { ReadWriteByteBuffer } from '../../../packages/@dcl/ecs/src/serialization/ByteBuffer'
import { Quaternion, Vector3 } from '../../../packages/@dcl/sdk/src/math'

describe('Legacy component tests', () => {
  it('cube example scene', async () => {
    const engine = Engine()
    const MeshRenderer = components.MeshRenderer(engine)
    const Transform = components.Transform(engine)

    function spawnCube(x: number, y: number, z: number) {
      const newCubeEntity = engine.addEntity()

      MeshRenderer.create(newCubeEntity, {
        mesh: { $case: 'box', box: { uvs: [0, 0, 0, 0] } }
      })

      Transform.create(newCubeEntity, {
        position: Vector3.create(x, y, z),
        scale: Vector3.One(),
        rotation: Quaternion.Identity(),
        parent: 0 as Entity
      })

      return newCubeEntity
    }

    function rotatorSystem(dt: number) {
      const group = engine.getEntitiesWith(Transform)
      for (const [, component] of group) {
        Quaternion.multiplyToRef(
          component.rotation,
          Quaternion.fromAngleAxis(dt * 10, Vector3.Up()),
          component.rotation
        )

        const transformData = new ReadWriteByteBuffer()
        const transformOriginal = { ...component }
        Transform.schema.serialize(transformOriginal, transformData)
        const transformReceveid = Transform.schema.deserialize(transformData)
        expect(transformReceveid).toBeDeepCloseTo(transformOriginal)
      }

      const groupBoxShape = engine.getEntitiesWith(MeshRenderer)
      for (const [, component] of groupBoxShape) {
        const boxShapeData = new ReadWriteByteBuffer()
        const boxShapeOriginal = { ...component }
        MeshRenderer.schema.serialize(boxShapeOriginal, boxShapeData)
        const boxShapeReceveid = MeshRenderer.schema.deserialize(boxShapeData)
        expect(boxShapeReceveid).toBeDeepCloseTo(boxShapeOriginal)
      }
    }

    spawnCube(4, 2, 4)
    engine.addSystem(rotatorSystem)
    await engine.update(1 / 60)
  })
})
