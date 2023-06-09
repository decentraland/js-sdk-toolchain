import { Entity, IEngine } from '@dcl/ecs'
import { SdkComponents } from './components'
import { Operations } from './operations'

export const ROOT = 0 as Entity

/**
 * Returns a tree of in the shape of Map<Entity, Set<Entity>> where the key is the parent and the value is the children
 * @returns
 */
export const getTreeFromEngine = (
  engine: IEngine,
  operations: Operations,
  Transform: SdkComponents['Transform']
): Map<Entity, Set<Entity>> => {
  // We build a map of children by their parent entity
  const childrenByParent = getEmptyTree()
  let dirtyEngine = false
  // This is a map of parent -> orphans[], it's used to keep track of orphans until the parent shows up
  const orphansByParent = new Map<Entity, Set<Entity>>()

  // This map allows to easily traverse the parent chain to detect cycles
  const parentByEntity = new Map<Entity, Entity>()

  // Helper to set a parent
  function setParent(entity: Entity, parent: Entity) {
    if (!childrenByParent.has(parent)) {
      throw Error(`Entity ${parent} has not been processed yet`)
    }
    childrenByParent.get(parent)!.add(entity)
    parentByEntity.set(entity, parent)
  }

  // Helper to check if an entity is an ancestor (parent or parent of parent, etc) of another entity
  function isAncestor(entity: Entity, ancestor: Entity) {
    let current = entity
    while (parentByEntity.has(current)) {
      current = parentByEntity.get(current)!
      if (current === ancestor) {
        return true
      }
    }
    return false
  }

  // Get all components in the engine
  for (const component of engine.componentsIter()) {
    // Get all entities with that component and loop them
    const entities = engine.getEntitiesWith(component)
    for (const [entity] of entities) {
      // Skip an entity if it was already processed (could happen for entities with more than one component)
      if (childrenByParent.has(entity)) {
        continue
      }

      // When the entitiy has a Transform, we created a linked node pointing to the parent
      if (Transform.has(entity)) {
        const transform = Transform.get(entity)
        const parent = transform.parent || ROOT
        // If the parent has already been processed we set it as parent of the current entity as long as it does not create a cycle
        if (childrenByParent.has(parent) && !isAncestor(entity, parent)) {
          setParent(entity, parent)
        } else {
          // If the parent is not known we link to the root (entity=0). This could happen because the parent has not been processed yet, or because it was deleted
          setParent(entity, ROOT)
          // We flag the entity as an orphan for later processing if the parent is processed afterwards
          if (orphansByParent.has(parent)) {
            orphansByParent.get(parent)!.add(entity)
          } else {
            orphansByParent.set(parent, new Set([entity]))
          }
        }
      } else {
        // When the entity does not have a Transform it is shown as a child of the root entity
        childrenByParent.get(ROOT)!.add(entity)
        dirtyEngine = true
      }
      // We flag the entity as processed
      childrenByParent.set(entity, new Set())

      // We check if this entity had any orphans and assign them to it
      if (orphansByParent.has(entity)) {
        const orphans = Array.from(orphansByParent.get(entity)!)
        for (const orphan of orphans) {
          if (isAncestor(entity, orphan)) {
            // If the orphan is already an ancestor of the entity, we skip it otherwise we would create a cycle
            continue
          }
          // Add orphan to parent's children
          setParent(orphan, entity)
          dirtyEngine = true
          // Delete orphan from root's children
          childrenByParent.get(ROOT)!.delete(orphan)
          // Delete orphan from orphans list
          orphansByParent.get(entity)!.delete(orphan)
        }
      }
    }
  }

  if (dirtyEngine) {
    void operations.dispatch()
  }

  return childrenByParent
}

/**
 * Used to return an empty tree when the sdk is not ready
 * @returns
 */
export function getEmptyTree() {
  const tree = new Map<Entity, Set<Entity>>()
  tree.set(ROOT, new Set<Entity>())
  return tree
}
