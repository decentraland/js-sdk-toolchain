import { Entity, IEngine, getComponentEntityTree, Transform as TransformEngine } from '@dcl/ecs'
import { isLastWriteWinComponent } from '../../../hooks/sdk/useComponentValue'

export function removeEntity(engine: IEngine) {
  return function removeEntity(entity: Entity) {
    const Transform = engine.getComponent(TransformEngine.componentId) as typeof TransformEngine
    for (const entityIterator of getComponentEntityTree(engine, entity, Transform)) {
      for (const component of engine.componentsIter()) {
        if (component.has(entityIterator) && isLastWriteWinComponent(component)) {
          component.deleteFrom(entityIterator)
        }
      }
    }
  }
}

export default removeEntity
