import { Entity, IEngine, Transform as TransformEngine, GltfContainer as GltfEngine, Vector3Type } from '@dcl/ecs'
import { EditorComponentIds, EditorComponents } from '../components'
import updateSelectedEntity from './update-selected-entity'

export function addAsset(engine: IEngine) {
  return function addAsset(parent: Entity, src: string, name: string, position: Vector3Type) {
    const child = engine.addEntity()
    const EntityNode = engine.getComponent(EditorComponentIds.EntityNode) as EditorComponents['EntityNode']
    const Transform = engine.getComponent(TransformEngine.componentId) as typeof TransformEngine
    const GltfContainer = engine.getComponent(GltfEngine.componentId) as typeof GltfEngine

    EntityNode.create(child, { label: name, parent })
    Transform.create(child, { parent, position })
    GltfContainer.create(child, { src })
    updateSelectedEntity(engine)(child)
    return child
  }
}

export default addAsset
