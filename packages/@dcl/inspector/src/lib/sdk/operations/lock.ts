import { IEngine, getComponentEntityTree, Entity, Transform as TransformEngine } from '@dcl/ecs'
import { EditorComponentNames, EditorComponents } from '../components'
import { addComponent as createAddComponent } from './add-component'
import { removeComponent as createRemoveComponent } from './remove-component'

export function lock(engine: IEngine) {
  return function lock(entity: Entity, value: boolean): void {
    const addComponent = createAddComponent(engine)
    const removeComponent = createRemoveComponent(engine)
    const Transform = engine.getComponent(TransformEngine.componentId) as typeof TransformEngine
    const Lock = engine.getComponent(EditorComponentNames.Lock) as EditorComponents['Lock']

    // Apply the lock to the entity and all its children
    const tree = Array.from(getComponentEntityTree(engine, entity, Transform))
    for (const node of tree) {
      if (value) {
        addComponent(node, Lock.componentId, { value: true })
      } else {
        removeComponent(node, Lock)
      }
    }
  }
}

export default lock
