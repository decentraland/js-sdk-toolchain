import { Entity, IEngine, Transform as TransformEngine } from '@dcl/ecs'
import { Quaternion, Vector3 } from '@dcl/ecs-math'
import { Matrix } from '@dcl/ecs-math/dist/Matrix'
import { getWorldMatrix } from '../../logic/math'

export function setParent(engine: IEngine) {
  return function setParent(entity: Entity, parent: Entity) {
    // it is desirable to preserve world matrix of re-parented entity unless SRT decomposition of adjusted local matrix is impossible
    const Transform = engine.getComponent(TransformEngine.componentId) as typeof TransformEngine

    const childWorld = getWorldMatrix(entity, Transform)
    const parentWorld = getWorldMatrix(parent, Transform)
    const localMatrix = Matrix.multiply(childWorld, Matrix.invert(parentWorld))

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
