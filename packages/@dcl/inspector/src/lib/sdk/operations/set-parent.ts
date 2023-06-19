import { Entity, IEngine, Transform as TransformEngine } from '@dcl/ecs'
import { getLocalMatrixAfterReparenting, decomposeMatrixSRT } from '../../logic/math'
import { Quaternion, Vector3 } from '@dcl/ecs-math'

export function setParent(engine: IEngine) {
  return function setParent(entity: Entity, parent: Entity) {
    // world position of an entity should not change unless SRT decomposition is impossible
    const Transform = engine.getComponent(TransformEngine.componentId) as typeof TransformEngine
    const localMatrix = getLocalMatrixAfterReparenting(entity, parent, Transform)
    const position = Vector3.create()
    const scale = Vector3.create()
    const rotation = Quaternion.create()

    if (decomposeMatrixSRT(localMatrix, scale, rotation, position)) {
      Transform.createOrReplace(entity, { parent, position, scale, rotation })
    } else {
      Transform.createOrReplace(entity, { parent })
    }
  }
}

export default setParent
