import { IEngine, Engine, TransformComponentExtended } from '@dcl/ecs'
import { Quaternion } from '@dcl/ecs-math'
import { areSRTMatrixesEqualWithEpsilon, getWorldMatrix } from './math'
import { Matrix } from '@dcl/ecs-math/dist/Matrix'
import { CoreComponents } from '../sdk/components'

describe('getWorldMatrix', () => {
  let engine: IEngine
  let transform: TransformComponentExtended
  beforeEach(() => {
    engine = Engine()
    transform = engine.getComponent(CoreComponents.TRANSFORM) as TransformComponentExtended
  })
  it('should correctly compute world matrixes of entities at the first three levels of hierarchy', () => {
    const e1 = engine.addEntity()
    const e2 = engine.addEntity()
    const e3 = engine.addEntity()

    transform.create(e2, {
      parent: e1,
      position: { x: 1, y: 1, z: 1 },
      scale: { x: 2, y: 2, z: 2 },
      rotation: Quaternion.fromEulerDegrees(45, 45, 45)
    })
    transform.create(e3, {
      parent: e2,
      position: { x: 2, y: 2, z: 2 },
      scale: { x: 2, y: 2, z: 2 },
      rotation: Quaternion.fromEulerDegrees(30, 30, 30)
    })

    expect(areSRTMatrixesEqualWithEpsilon(getWorldMatrix(e1, transform), Matrix.Identity())).toBe(true)
    expect(
      areSRTMatrixesEqualWithEpsilon(
        getWorldMatrix(e2, transform),
        Matrix.compose({ x: 2, y: 2, z: 2 }, Quaternion.fromEulerDegrees(45, 45, 45), { x: 1, y: 1, z: 1 })
      )
    ).toBe(true)
    expect(
      areSRTMatrixesEqualWithEpsilon(
        getWorldMatrix(e3, transform),
        Matrix.compose({ x: 4, y: 4, z: 4 }, Quaternion.fromEulerDegrees(34.32064917, 98.0173426, 102.24704707), {
          x: 5.82842712,
          y: 2.17157287,
          z: 5.82842712
        })
      )
    ).toBe(true)
  })
})
