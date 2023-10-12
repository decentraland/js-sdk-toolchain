import { Entity, IEngine, getComponentEntityTree, Transform as TransformEngine } from '@dcl/ecs'
import { getNextId } from '@dcl/asset-packs'

import { isLastWriteWinComponent } from '../../../hooks/sdk/useComponentValue'
import { EditorComponentNames, EditorComponents } from '../components'
import { addNode, pushChild } from '../nodes'
import updateSelectedEntity from './update-selected-entity'
import { COMPONENTS_WITH_ID } from './add-component'

export function duplicateEntity(engine: IEngine) {
  return function duplicateEntity(entity: Entity) {
    const originalToDuplicate: Map<Entity, Entity> = new Map()
    const Transform = engine.getComponent(TransformEngine.componentId) as typeof TransformEngine
    const Nodes = engine.getComponent(EditorComponentNames.Nodes) as EditorComponents['Nodes']
    const Triggers = engine.getComponent(EditorComponentNames.Triggers) as EditorComponents['Triggers']

    // map ids
    const newIds = new Map<number, number>()

    for (const entityIterator of getComponentEntityTree(engine, entity, Transform)) {
      const duplicate = engine.addEntity()
      originalToDuplicate.set(entityIterator, duplicate)
      Nodes.createOrReplace(engine.RootEntity, { value: addNode(engine, duplicate) })
      // copy values of all components of original entity
      for (const component of engine.componentsIter()) {
        if (component.has(entityIterator) && isLastWriteWinComponent(component)) {
          const componentValue = component.get(entityIterator)
          let newComponentValue = JSON.parse(JSON.stringify(componentValue))
          // if the component requires an id, generate a new one and add it to the newIds map
          const requiresId = COMPONENTS_WITH_ID.includes(component.componentName)
          if (requiresId) {
            const oldId = newComponentValue.id
            const newId = getNextId(engine as any)
            newIds.set(oldId, newId)
            newComponentValue = {
              ...newComponentValue,
              id: newId
            }
          }
          component.create(duplicate, newComponentValue)
        }
      }

      // if the entity has triggers, remap the old ids in the actions and conditions to the new ones
      if (Triggers.has(duplicate)) {
        const triggers = Triggers.getMutable(duplicate)
        for (const trigger of triggers.value) {
          for (const action of trigger.actions) {
            if (action.id) {
              const newId = newIds.get(action.id)
              if (newId) {
                action.id = newId
              }
            }
          }
          if (trigger.conditions) {
            for (const condition of trigger.conditions) {
              if (condition.id) {
                const newId = newIds.get(condition.id)
                if (newId) {
                  condition.id = newId
                }
              }
            }
          }
        }
      }
    }

    // if Transform points to an entity within subtree being duplicated, re-direct it to duplicated entity
    for (const entityIterator of originalToDuplicate.values()) {
      const transform = Transform.getMutableOrNull(entityIterator)
      if (transform === null || !transform.parent) {
        Nodes.createOrReplace(engine.RootEntity, { value: pushChild(engine, engine.RootEntity, entityIterator) })
      } else {
        const parent = originalToDuplicate.get(transform.parent) || transform.parent
        transform.parent = parent
        Nodes.createOrReplace(engine.RootEntity, { value: pushChild(engine, parent, entityIterator) })
      }
    }

    const duplicate = originalToDuplicate.get(entity)!
    updateSelectedEntity(engine)(duplicate)
    return duplicate
  }
}

export default duplicateEntity
