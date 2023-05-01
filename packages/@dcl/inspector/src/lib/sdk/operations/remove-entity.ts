import {
  Entity,
  IEngine,
  LastWriteWinElementSetComponentDefinition,
  getComponentEntityTree,
  Transform,
  ComponentDefinition
} from '@dcl/ecs'
import { isLastWriteWinComponent } from '../../../hooks/sdk/useComponentValue'
import { EditorComponentIds, EditorComponents } from '../components'

export function removeEntity(engine: IEngine) {
  return function (entity: Entity, updateEngine = false) {
    const ParentComponent =
      (engine.getComponentOrNull(EditorComponentIds.EntityNode) as EditorComponents['EntityNode']) ?? Transform
    for (const entityIterator of getComponentEntityTree(engine, entity, ParentComponent)) {
      for (const component of engine.componentsIter()) {
        if (component.has(entityIterator) && isLastWriteWinComponent(component)) {
          component.deleteFrom(entityIterator)
        }
      }
    }
    if (updateEngine) return engine.update(1 / 16)
  }
}

export default removeEntity

// // we cannot use "engine.removeEntity" (or similar) since undoing that won't be possible
//     // because entities cannot be re-created. It's easier to remove all the components from the entity,
//     // and in case of an undo, recreate them...
//     for (const _entity of getComponentEntityTree(sdk.engine, entity, EntityNode)) {
//       for (const component of sdk.engine.componentsIter()) {
//         if (component.has(_entity) && isLastWriteWinComponent(component)) {
//           component.deleteFrom(_entity)
//         }
//       }
//     }
