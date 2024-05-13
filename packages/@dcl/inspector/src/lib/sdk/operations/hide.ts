import { IEngine, getComponentEntityTree, Entity, Transform as TransformEngine } from '@dcl/ecs'
import { EditorComponentNames, EditorComponents } from '../components'
import { addComponent as createAddComponent } from './add-component'
import { removeComponent as createRemoveComponent } from './remove-component'

export function lock(engine: IEngine) {
  return function lock(entity: Entity, value: boolean): void {
    const addComponent = createAddComponent(engine)
    const removeComponent = createRemoveComponent(engine)
    const Transform = engine.getComponent(TransformEngine.componentId) as typeof TransformEngine
    const Hide = engine.getComponent(EditorComponentNames.Hide) as EditorComponents['Hide']

    // Apply the hide to the entity and all its children
    const tree = Array.from(getComponentEntityTree(engine, entity, Transform))
    for (const node of tree) {
      if (value) {
        addComponent(node, Hide.componentId, { value: true })
      } else {
        removeComponent(node, Hide)
      }
    }
  }
}

export default lock
