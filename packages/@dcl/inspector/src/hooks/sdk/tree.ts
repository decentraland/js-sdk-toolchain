import { Entity } from '@dcl/ecs'
import { useState } from 'react'
import { Node } from '../../components/Tree'
import { engine, Transform } from '../../lib/sdk/engine'

type LinkedNode = {
  entity: number
  parent: number
}
/**
 * Converts a linked tree into a tree
 * @param linkedTree
 * @param parent
 * @returns
 */
const toTree = (linkedTree: LinkedNode[], parent: number = 0): Node[] =>
  linkedTree
    .filter((node) => node.entity !== parent && node.parent === parent)
    .map<Node>((node) => ({
      id: node.entity.toString(),
      value: node.entity,
      label: node.entity.toString(),
      children: toTree(linkedTree, node.entity)
    }))

const getTree = () => {
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
      // When the entitiy has a transform, we created a linked node pointing to the parent
      if (Transform.has(entity)) {
        const transform = Transform.get(entity)
        const parent = transform.parent || 0
        // If the parent has already been processed we link to it
        if (processed.has(parent)) {
          linkedTree.push({ entity, parent })
        } else {
          // If the parent is now known we link to the root (entity=0). This could happen because the parent has not been processed yet, or because it was deleted
          const node = { entity, parent: 0 }
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
        linkedTree.push({ entity, parent: 0 })
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
  const tree = toTree(linkedTree)
  return tree
}

export const useTree = () => {
  const [tree, setTree] = useState(getTree())

  const update = async () => {
    await engine.update(0)
    setTree(getTree())
  }

  const addChild = async (id: string, label: string) => {
    const parent = Number(id) as Entity
    const child = engine.addEntity()
    Transform.create(child, { parent })
    await update()
  }

  const setParent = async (id: string, newParentId: string | null) => {
    const entity = Number(id) as Entity
    const parent = Number(newParentId) as Entity
    const transform = Transform.getMutable(entity)
    transform.parent = parent
    await update()
  }

  const rename = (id: string, newLabel: string) => {}

  const remove = async (id: string) => {
    const entity = Number(id) as Entity
    engine.removeEntity(entity)
    await update()
  }

  return { tree, addChild, setParent, rename, remove }
}
