import { Entity, IEngine, Transform as TransformEngine } from '@dcl/ecs'
import { getLocalMatrixAfterReparenting } from '../../logic/math'
import { Quaternion, Vector3 } from '@dcl/ecs-math'
import { Matrix } from '@dcl/ecs-math/dist/Matrix'

export function setParent(engine: IEngine) {
  return function setParent(entity: Entity, parent: Entity) {
    // world matrix of an entity should not change unless SRT decomposition of adjusted local matrix is impossible
    const Transform = engine.getComponent(TransformEngine.componentId) as typeof TransformEngine
    const localMatrix = getLocalMatrixAfterReparenting(entity, parent, Transform)
    const position = Vector3.create()
    const scale = Vector3.create()
    const rotation = Quaternion.create()

    if (Matrix.decompose(localMatrix, scale, rotation, position)) {
      Transform.createOrReplace(entity, { parent, position, scale, rotation })
    } else {
      Transform.createOrReplace(entity, { parent })
    }
  }
}

export default setParent
