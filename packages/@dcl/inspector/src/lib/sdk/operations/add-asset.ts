import {
  Entity,
  IEngine,
  Transform as TransformEngine,
  GltfContainer as GltfEngine,
  Vector3Type,
  Name as NameEngine
} from '@dcl/ecs'
import updateSelectedEntity from './update-selected-entity'

export function addAsset(engine: IEngine) {
  return function addAsset(parent: Entity, src: string, name: string, position: Vector3Type) {
    const child = engine.addEntity()
    const Name = engine.getComponent(NameEngine.componentId) as typeof NameEngine
    const Transform = engine.getComponent(TransformEngine.componentId) as typeof TransformEngine
    const GltfContainer = engine.getComponent(GltfEngine.componentId) as typeof GltfEngine

    Name.create(child, { value: name })
    Transform.create(child, { parent, position })
    GltfContainer.create(child, { src })
    updateSelectedEntity(engine)(child)
    return child
  }
}

export default addAsset
