import { Entity, IEngine, getComponentEntityTree, Transform as TransformEngine } from '@dcl/ecs'

import { isLastWriteWinComponent } from '../../../hooks/sdk/useComponentValue'
import { EditorComponentNames, EditorComponents } from '../components'
import { removeNode } from '../nodes'

export function removeEntity(engine: IEngine) {
  return function removeEntity(entity: Entity) {
    const Transform = engine.getComponent(TransformEngine.componentId) as typeof TransformEngine
    const Nodes = engine.getComponent(EditorComponentNames.Nodes) as EditorComponents['Nodes']

    for (const entityIterator of getComponentEntityTree(engine, entity, Transform)) {
      Nodes.createOrReplace(engine.RootEntity, { value: removeNode(engine, entityIterator) })
      for (const component of engine.componentsIter()) {
        if (component.has(entityIterator) && isLastWriteWinComponent(component)) {
          component.deleteFrom(entityIterator)
        }
      }
    }
  }
}

export default removeEntity
