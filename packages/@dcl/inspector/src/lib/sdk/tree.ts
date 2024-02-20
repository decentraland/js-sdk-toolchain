import { Entity, engine, IEngine } from '@dcl/ecs'
import { EditorComponents } from './components'

export const ROOT = engine.RootEntity
export const PLAYER = engine.PlayerEntity
export const CAMERA = engine.CameraEntity

/**
 * Returns a tree in the shape of Map<Entity, Set<Entity>> where the key is the parent and the value is the children
 * @returns
 */
export const getTreeFromEngine = (engine: IEngine, Nodes: EditorComponents['Nodes']): Map<Entity, Set<Entity>> => {
  const tree = getEmptyTree()
  const nodes = Nodes.getOrNull(engine.RootEntity)?.value || []

  for (const { entity, children } of nodes) {
    tree.set(entity, new Set(children))
  }

  return tree
}

/**
 * Get a tree with ROOT as the only node
 * @returns
 */
export function getEmptyTree() {
  const tree = new Map<Entity, Set<Entity>>()
  tree.set(ROOT, new Set<Entity>())
  tree.set(PLAYER, new Set<Entity>())
  tree.set(CAMERA, new Set<Entity>())
  return tree
}

/**
 *
 * @param tree tree in the shape of Map<Entity, Set> where the key is the parent and the value are the children
 * @param entity entity to get parent from
 * @returns the parent of the provided entity
 */
export function findParent(tree: Map<Entity, Set<Entity>>, entity: Entity) {
  for (const [parent, children] of tree) {
    if (children.has(entity)) return parent
  }
  return ROOT
}
