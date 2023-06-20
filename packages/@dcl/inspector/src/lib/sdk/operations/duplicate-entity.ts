import { Entity, IEngine, getComponentEntityTree, Transform } from '@dcl/ecs'
import { isLastWriteWinComponent } from '../../../hooks/sdk/useComponentValue'
import updateSelectedEntity from './update-selected-entity'

export function duplicateEntity(engine: IEngine) {
  return function duplicateEntity(entity: Entity) {
    const originalToDuplicate: Map<Entity, Entity> = new Map()
    const TransformComponent = engine.getComponent(Transform.componentId) as typeof Transform

    for (const entityIterator of getComponentEntityTree(engine, entity, TransformComponent)) {
      const duplicate = engine.addEntity()
      originalToDuplicate.set(entityIterator, duplicate)
      // copy values of all components of original entity
      for (const component of engine.componentsIter()) {
        if (component.has(entityIterator) && isLastWriteWinComponent(component)) {
          const componentValue = component.get(entityIterator)
          component.create(duplicate, JSON.parse(JSON.stringify(componentValue)))
        }
      }
    }

    // if Transform points to an entity within subtree being duplicated, re-direct it to duplicated entity
    for (const image of originalToDuplicate.values()) {
      const transform = TransformComponent.getMutableOrNull(image)
      if (transform === null || !transform.parent) continue
      if (originalToDuplicate.has(transform.parent)) {
        transform.parent = originalToDuplicate.get(transform.parent)
      }
    }

    const duplicate = originalToDuplicate.get(entity)!
    updateSelectedEntity(engine)(duplicate)
    return duplicate
  }
}

export default duplicateEntity
