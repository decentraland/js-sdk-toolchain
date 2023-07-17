import { Entity, IEngine, Transform as TransformEngine, GltfContainer as GltfEngine, Vector3Type } from '@dcl/ecs'
import updateSelectedEntity from './update-selected-entity'
import { addChild } from './add-child'

export function addAsset(engine: IEngine) {
  return function addAsset(parent: Entity, src: string, name: string, position: Vector3Type): Entity {
    const child = addChild(engine)(parent, name)
    const Transform = engine.getComponent(TransformEngine.componentId) as typeof TransformEngine
    const GltfContainer = engine.getComponent(GltfEngine.componentId) as typeof GltfEngine

    Transform.createOrReplace(child, { parent, position })
    GltfContainer.create(child, { src })
    updateSelectedEntity(engine)(child)

    return child
  }
}

export default addAsset
