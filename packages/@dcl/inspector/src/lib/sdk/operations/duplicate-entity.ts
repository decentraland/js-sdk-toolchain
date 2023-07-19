import { Entity, IEngine, getComponentEntityTree, Transform as TransformEngine } from '@dcl/ecs'

import { isLastWriteWinComponent } from '../../../hooks/sdk/useComponentValue'
import { EditorComponentNames, EditorComponents } from '../components'
import { addNode, pushChild } from '../nodes'
import updateSelectedEntity from './update-selected-entity'

export function duplicateEntity(engine: IEngine) {
  return function duplicateEntity(entity: Entity) {
    const originalToDuplicate: Map<Entity, Entity> = new Map()
    const Transform = engine.getComponent(TransformEngine.componentId) as typeof TransformEngine
    const Nodes = engine.getComponent(EditorComponentNames.Nodes) as EditorComponents['Nodes']

    for (const entityIterator of getComponentEntityTree(engine, entity, Transform)) {
      const duplicate = engine.addEntity()
      originalToDuplicate.set(entityIterator, duplicate)
      Nodes.createOrReplace(engine.RootEntity, { value: addNode(engine, duplicate) })
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
      const transform = Transform.getMutableOrNull(image)
      if (transform === null || !transform.parent) {
        Nodes.createOrReplace(engine.RootEntity, { value: pushChild(engine, engine.RootEntity, image) })
      } else {
        const parent = originalToDuplicate.get(transform.parent) || transform.parent
        transform.parent = parent
        Nodes.createOrReplace(engine.RootEntity, { value: pushChild(engine, parent, image) })
      }
    }

    const duplicate = originalToDuplicate.get(entity)!
    updateSelectedEntity(engine)(duplicate)
    return duplicate
  }
}

export default duplicateEntity
