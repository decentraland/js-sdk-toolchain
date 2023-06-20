import { IEngine, Engine, TransformComponentExtended } from '@dcl/ecs'
import { setParent } from './set-parent'
import { Quaternion } from '@dcl/ecs-math'
import { areSRTMatrixesEqualWithEpsilon, getWorldMatrix } from '../../logic/math'

describe('setParent', () => {
  let engine: IEngine
  let transform: TransformComponentExtended
  beforeEach(() => {
    engine = Engine()
    transform = engine.getComponent('core::Transform') as TransformComponentExtended
  })
  it('should correctly re-parent an entity and preserve its world matrix', () => {
    const oldParent = engine.addEntity()
    const newParent = engine.addEntity()
    const child = engine.addEntity()

    transform.create(oldParent, { position: { x: 1, y: 1, z: 1 }, scale: { x: 2, y: 2, z: 2 } })
    transform.create(newParent, {
      position: { x: 10, y: 10, z: 10 },
      rotation: Quaternion.fromEulerDegrees(30, 45, 60)
    })
    transform.create(child, { parent: oldParent, position: { x: 5, y: 5, z: 5 } })

    const worldMatrixBefore = getWorldMatrix(child, transform)
    setParent(engine)(child, newParent)
    const worldMatrixAfter = getWorldMatrix(child, transform)

    expect(transform.get(child).parent).toBe(newParent)
    expect(areSRTMatrixesEqualWithEpsilon(worldMatrixBefore, worldMatrixAfter)).toBe(true)
  })
})
