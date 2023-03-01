import { Entity } from '@dcl/ecs'
import { useEffect, useState } from 'react'
import { Node } from '../../components/Tree'
import { InspectorEngine } from '../../lib/sdk/engine'

type LinkedNode = {
  entity: number
  parent: number
  label?: string
  open?: boolean
}

/**
 * Converts a linked tree into a tree
 * @param linkedTree
 * @param parent
 * @returns
 */
const toTree = (engine: InspectorEngine, linkedTree: LinkedNode[], parent: number = 0): Node[] =>
  linkedTree
    .filter((node) => node.entity !== parent && node.parent === parent)
    .map<Node>((node) => ({
      id: node.entity.toString(),
      value: node.entity,
      label: node.label,
      open: node.open,
      selected: engine.editorComponents.EntitySelected.has(node.entity as Entity),
      children: toTree(engine, linkedTree, node.entity)
    }))

/**
 * Returns a tree of entities
 * @returns
 */
const getTree = (inspectorEngine: InspectorEngine) => {
  const { engine, editorComponents, sdkComponents } = inspectorEngine

  // We build a linked tree first because it's easier to build by looping the engine state
  const linkedTree: LinkedNode[] = [{ entity: 0, parent: 0 }]

  // This set is used to flag the already processed entities
  const processed = new Set<number>()

  // This is a map of parent -> orphans[]
  const orphansByParent = new Map<number, LinkedNode[]>()

  // Get all components in the engine
  for (const component of engine.componentsIter()) {
    // Get all entities with that component and loop them
    const entities = engine.getEntitiesWith(component)
    for (const [entity] of entities) {
      // Skip an entity if it was already processed (could happen for entities with more than one component)
      if (processed.has(entity)) {
        continue
      }
      // Get the label of the entity if it has one
      let label: string | undefined
      if (editorComponents.Label.has(entity)) {
        label = editorComponents.Label.get(entity).label
      }
      // Get toggle of the entity if any
      let open: boolean | undefined
      if (editorComponents.Toggle.has(entity)) {
        open = true
      }

      // When the entitiy has a transform, we created a linked node pointing to the parent
      if (sdkComponents.Transform.has(entity)) {
        const transform = sdkComponents.Transform.get(entity)
        const parent = transform.parent || 0
        // If the parent has already been processed we link to it
        if (processed.has(parent)) {
          linkedTree.push({ entity, label, open, parent })
        } else {
          // If the parent is now known we link to the root (entity=0). This could happen because the parent has not been processed yet, or because it was deleted
          const node = { entity, label, open, parent: 0 }
          linkedTree.push(node)
          // We flag the entity as an orphan for later processing if the parent is processed afterwards
          if (orphansByParent.has(parent)) {
            orphansByParent.get(parent)!.push(node)
          } else {
            orphansByParent.set(parent, [node])
          }
        }
      } else {
        // When the entity does not have a transform it is shown as a child of the root entity
        linkedTree.push({ entity, label, open, parent: 0 })
      }
      // We flag the entity as processed
      processed.add(entity)

      // If the entity had orphan entities pointing to it, we now loop over the children and reparent them to the now processed parent entity
      if (orphansByParent.has(entity)) {
        const children = orphansByParent.get(entity)!
        while (children.length > 0) {
          const child = children.pop()!
          child.parent = entity
        }
        orphansByParent.delete(entity)
      }
    }
  }
  // Now we convert the linked tree into an actual tree and return it
  return toTree(inspectorEngine, linkedTree)
}

export const useTree = (inspectorEngine: InspectorEngine) => {
  const [tree, setTree] = useState(getTree(inspectorEngine))

  const { engine, editorComponents, sdkComponents } = inspectorEngine

  const update = async () => {
    setTree(getTree(inspectorEngine))
  }

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

  const addChild = async (id: string, label: string) => {
    const parent = Number(id) as Entity
    const child = engine.addEntity()
    sdkComponents.Transform.create(child, { parent })
    editorComponents.Label.create(child, { label })
    await update()
  }

  const setParent = async (id: string, newParentId: string | null) => {
    const entity = Number(id) as Entity
    const parent = Number(newParentId) as Entity
    const transform = sdkComponents.Transform.getMutable(entity)
    transform.parent = parent
    editorComponents.Toggle.createOrReplace(parent)
    await update()
  }

  const rename = async (id: string, label: string) => {
    const entity = Number(id) as Entity
    editorComponents.Label.createOrReplace(entity, { label })
    await update()
  }

  const remove = async (id: string) => {
    const entity = Number(id) as Entity
    engine.removeEntity(entity)
    await update()
  }

  const toggle = async (id: string, open: boolean) => {
    const entity = Number(id) as Entity

    for (const [e] of engine.getEntitiesWith(editorComponents.EntitySelected)) {
      if (e !== entity) {
        editorComponents.EntitySelected.deleteFrom(e)
      }
    }
    editorComponents.EntitySelected.createOrReplace(entity, { gizmo: 1 })

    if (open) {
      editorComponents.Toggle.createOrReplace(entity)
    } else {
      editorComponents.Toggle.deleteFrom(entity)
    }
    await update()
  }

  return { tree, addChild, setParent, rename, remove, toggle }
}
