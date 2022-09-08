import {
  Quaternion,
  Vector3
} from '../../../packages/@dcl/ecs/src/runtime/Math'
import { Engine, IEntity } from '../../../packages/@dcl/ecs/src/engine'
import { setupDclInterfaceForThisSuite, testingExperimentalAPI } from '../utils'

describe('Legacy component tests', () => {
  const engineApi = testingExperimentalAPI()
  setupDclInterfaceForThisSuite({
    ...engineApi.modules
  })

  it('cube example scene', () => {
    const engine = Engine()
    const sdk = engine.baseComponents

    function spawnCube(x: number, y: number, z: number) {
      const newCubeEntity = engine.addEntity()

      sdk.BoxShape.create(newCubeEntity, {
        isPointerBlocker: true,
        visible: true,
        withCollisions: true,
        uvs: [0, 0, 0, 0]
      })

      sdk.Transform.create(newCubeEntity, {
        position: Vector3.create(x, y, z),
        scale: Vector3.One(),
        rotation: Quaternion.Identity(),
        parent: 0 as IEntity
      })

      return newCubeEntity
    }

    function rotatorSystem(dt: number) {
      const group = engine.getEntitiesWith(sdk.Transform)
      for (const [entity, component] of group) {
        Quaternion.multiplyToRef(
          component.rotation,
          Quaternion.angleAxis(dt * 10, Vector3.Up()),
          component.rotation
        )

        const transformData = sdk.Transform.toBinary(entity)
        const transformOriginal = { ...component }
        const transformReceveid = sdk.Transform.updateFromBinary(
          entity,
          transformData
        )
        expect(transformReceveid).toBeDeepCloseTo(transformOriginal)
      }

      const groupBoxShape = engine.getEntitiesWith(sdk.BoxShape)
      for (const [entity, component] of groupBoxShape) {
        const boxShapeData = sdk.BoxShape.toBinary(entity)
        // TODO: see this
        const boxShapeOriginal = { ...component } as any
        const boxShapeReceveid = sdk.BoxShape.updateFromBinary(
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
