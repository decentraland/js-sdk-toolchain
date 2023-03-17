import { Entity, IEngine, TransformComponent } from '@dcl/ecs'

export const ROOT = 0 as Entity

/**
 * Returns a tree of in the shape of Map<Entity, Set<Entity>> where the key is the parent and the value is the children
 * @returns
 */
export const getTreeFromEngine = (engine: IEngine, Transform: TransformComponent) => {
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
      if (Transform.has(entity)) {
        const transform = Transform.get(entity)
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

/**
 * Used to return an empty tree when the sdk is not ready
 * @returns
 */
export function getEmptyTree() {
  const tree = new Map<Entity, Set<Entity>>()
  tree.set(ROOT, new Set<Entity>())
  return tree
}
