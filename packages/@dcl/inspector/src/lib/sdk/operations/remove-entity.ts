import { Entity, IEngine, getComponentEntityTree, Transform } from '@dcl/ecs'
import { isLastWriteWinComponent } from '../../../hooks/sdk/useComponentValue'
import { EditorComponentIds, EditorComponents } from '../components'

export function removeEntity(engine: IEngine) {
  return function removeEntity(entity: Entity) {
    const ParentComponent =
      (engine.getComponentOrNull(EditorComponentIds.EntityNode) as EditorComponents['EntityNode']) ??
      engine.getComponentOrNull(Transform.componentId)
    for (const entityIterator of getComponentEntityTree(engine, entity, ParentComponent)) {
      for (const component of engine.componentsIter()) {
        if (component.has(entityIterator) && isLastWriteWinComponent(component)) {
          component.deleteFrom(entityIterator)
        }
      }
    }
  }
}

export default removeEntity
