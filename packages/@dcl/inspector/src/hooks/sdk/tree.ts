import { Entity } from '@dcl/ecs'
import { useEffect, useState } from 'react'
import { InspectorEngine } from '../../lib/sdk/engine'

export const ROOT = 0 as Entity

/**
 * Returns a tree of entities
 * @returns
 */
const getTree = (inspectorEngine: InspectorEngine) => {
  const { engine, sdkComponents } = inspectorEngine

  // We build a map of children by their parent entity
  const childrenByParent = new Map<Entity, Set<Entity>>()
  childrenByParent.set(ROOT, new Set<Entity>())

  // This is a map of parent -> orphans[], it's used to keep track of orphans until the parent shows up
  const orphansByParent = new Map<Entity, Set<Entity>>()

  // Get all components in the engine
  for (const component of engine.componentsIter()) {
    // Get all entities with that component and loop them
    const entities = engine.getEntitiesWith(component)
    for (const [entity] of entities) {
      // Skip an entity if it was already processed (could happen for entities with more than one component)
      if (childrenByParent.has(entity)) {
        continue
      }

      // When the entitiy has a transform, we created a linked node pointing to the parent
      if (sdkComponents.Transform.has(entity)) {
        const transform = sdkComponents.Transform.get(entity)
        const parent = transform.parent || ROOT
        // If the parent has already been processed we link to it
        if (childrenByParent.has(parent)) {
          childrenByParent.get(parent)!.add(entity)
        } else {
          // If the parent is not known we link to the root (entity=0). This could happen because the parent has not been processed yet, or because it was deleted
          childrenByParent.get(ROOT)!.add(entity)
          // We flag the entity as an orphan for later processing if the parent is processed afterwards
          if (orphansByParent.has(parent)) {
            orphansByParent.get(parent)!.add(entity)
          } else {
            orphansByParent.set(parent, new Set([entity]))
          }
        }
      } else {
        // When the entity does not have a transform it is shown as a child of the root entity
        childrenByParent.get(ROOT)!.add(entity)
      }
      // We flag the entity as processed
      childrenByParent.set(entity, new Set())

      // We check if this entity had any orphans and assign them to it
      if (orphansByParent.has(entity)) {
        const orphans = Array.from(orphansByParent.get(entity)!)
        for (const orphan of orphans) {
          // Add child to parent's children
          childrenByParent.get(entity)!.add(orphan)
          // Delete child from root's children
          childrenByParent.get(ROOT)!.delete(orphan)
          // Delete child from orphans list
          orphansByParent.get(entity)!.delete(orphan)
        }
      }
    }
  }

  return childrenByParent
}

export const useTree = (inspectorEngine: InspectorEngine) => {
  const [tree, setTree] = useState(getTree(inspectorEngine))

  const { engine, editorComponents, sdkComponents } = inspectorEngine

  const update = () => setTree(getTree(inspectorEngine))

  const { Label, Toggle, EntitySelected } = editorComponents

  const getId = (entity: Entity) => entity.toString()
  const getChildren = (entity: Entity) => Array.from(tree.get(entity)!)
  const getLabel = (entity: Entity) => (Label.has(entity) ? Label.get(entity).label : entity.toString())
  const isOpen = (entity: Entity) => Toggle.has(entity)
  const isSelected = (entity: Entity) => EntitySelected.has(entity)

  useEffect(() => {
    const updateTreeInterval = setInterval(() => {
      // this engine.update
      // 1) flushes all the transport incoming messages from the DataLayer
      // 2) cleans the local dirty state and sends it to the data DataLayer
      // we keep it here for convenience, it should be reactive.. maybe using onChangeFunction
      void engine.update(0)
    }, 16)
    engine.addSystem(update, -Infinity)
    return () => {
      clearInterval(updateTreeInterval)
      engine.removeSystem(update)
    }
  }, [engine])

  const addChild = async (parent: Entity, label: string) => {
    const child = engine.addEntity()
    sdkComponents.Transform.create(child, { parent })
    editorComponents.Label.create(child, { label })
    update()
  }

  const setParent = async (entity: Entity, parent: Entity) => {
    const transform = sdkComponents.Transform.getMutable(entity)
    transform.parent = parent
    editorComponents.Toggle.createOrReplace(parent)
    update()
  }

  const rename = async (entity: Entity, label: string) => {
    editorComponents.Label.createOrReplace(entity, { label })
    update()
  }

  const remove = async (entity: Entity) => {
    engine.removeEntity(entity)
    update()
  }

  const toggle = async (entity: Entity, open: boolean) => {
    for (const [_entity] of engine.getEntitiesWith(editorComponents.EntitySelected)) {
      if (_entity !== entity) {
        editorComponents.EntitySelected.deleteFrom(_entity)
      }
    }
    editorComponents.EntitySelected.createOrReplace(entity, { gizmo: 1 })

    if (open) {
      editorComponents.Toggle.createOrReplace(entity)
    } else {
      editorComponents.Toggle.deleteFrom(entity)
    }
    update()
  }

  return { tree, addChild, setParent, rename, remove, toggle, getId, getChildren, getLabel, isOpen, isSelected }
}
