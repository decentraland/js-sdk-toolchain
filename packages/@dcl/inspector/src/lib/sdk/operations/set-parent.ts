import { Entity, IEngine, Transform as TransformEngine } from '@dcl/ecs'
import { Quaternion, Vector3 } from '@dcl/ecs-math'
import { Matrix } from '@dcl/ecs-math/dist/Matrix'
import { getWorldMatrix } from '../../logic/math'
import { EditorComponentNames, EditorComponents } from '../components'
import { pushChild, removeChild } from '../nodes'

export function setParent(engine: IEngine) {
  return function setParent(entity: Entity, parent: Entity) {
    // it is desirable to preserve world matrix of re-parented entity unless SRT decomposition of adjusted local matrix is impossible
    const Transform = engine.getComponent(TransformEngine.componentId) as typeof TransformEngine
    const Nodes = engine.getComponent(EditorComponentNames.Nodes) as EditorComponents['Nodes']
    const currentParent = Transform.getOrNull(entity)?.parent

    if (currentParent === parent) return

    const childWorld = getWorldMatrix(entity, Transform)
    const parentWorld = getWorldMatrix(parent, Transform)
    const localMatrix = Matrix.multiply(childWorld, Matrix.invert(parentWorld))

    const position = Vector3.create()
    const scale = Vector3.create()
    const rotation = Quaternion.create()

    // set new parent + coords based on it
    if (Matrix.decompose(localMatrix, scale, rotation, position)) {
      Transform.createOrReplace(entity, { parent, position, scale, rotation })
    } else {
      Transform.createOrReplace(entity, { parent })
    }

    // remove child from previous parent
    if (currentParent !== undefined) {
      Nodes.createOrReplace(engine.RootEntity, { value: removeChild(engine, currentParent, entity) })
    }

    // add child to new parent
    Nodes.createOrReplace(engine.RootEntity, { value: pushChild(engine, parent, entity) })
  }
}

export default setParent
