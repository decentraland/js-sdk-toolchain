import {
  Engine,
  Entity,
  components,
  Quaternion,
  Vector3
} from '../../../packages/@dcl/ecs/src'

describe('Legacy component tests', () => {
  it('cube example scene', () => {
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
      for (const [entity, component] of group) {
        Quaternion.multiplyToRef(
          component.rotation,
          Quaternion.fromAngleAxis(dt * 10, Vector3.Up()),
          component.rotation
        )

        const transformData = Transform.toBinary(entity)
        const transformOriginal = { ...component }
        const transformReceveid = Transform.updateFromBinary(
          entity,
          transformData
        )
        expect(transformReceveid).toBeDeepCloseTo(transformOriginal)
      }

      const groupBoxShape = engine.getEntitiesWith(MeshRenderer)
      for (const [entity, component] of groupBoxShape) {
        const boxShapeData = MeshRenderer.toBinary(entity)
        // TODO: see this
        const boxShapeOriginal = { ...component } as any
        const boxShapeReceveid = MeshRenderer.updateFromBinary(
          entity,
          boxShapeData
        )
        expect(boxShapeReceveid).toBeDeepCloseTo(boxShapeOriginal)
      }
    }

    spawnCube(4, 2, 4)
    engine.addSystem(rotatorSystem)
    engine.update(1 / 60)
  })
})
