import * as components from '../../components'
import { Entity } from '../../engine/entity'
import { ComponentDefinition, IEngine } from '../../engine'

function* genEntityTree<T>(entity: Entity, entities: Map<Entity, T & { parent?: Entity }>): Generator<Entity> {
  // This avoid infinite loop when there is a cyclic parenting
  if (!entities.has(entity)) return
  entities.delete(entity)

  for (const [_entity, value] of entities) {
    if (value.parent === entity) {
      yield* genEntityTree(_entity, entities)
    }
  }

  yield entity
}

/**
 * Get an iterator of entities that follow a tree structure for a component
 * @public
 * @param engine - the engine running the entities
 * @param entity - the root entity of the tree
 * @param component - the parenting component to filter by
 * @returns An iterator of an array as [entity, entity2, ...]
 *
 * Example:
 * ```ts
 * const TreeComponent = engine.defineComponent('custom::TreeComponent', {
 *    label: Schemas.String,
 *    parent: Schemas.Entity
 * })
 *
 * for (const entity of getComponentEntityTree(engine, entity, TreeComponent)) {
 *    // entity in the tree
 * }
 * ```
 */
export function getComponentEntityTree<T>(
  engine: IEngine,
  entity: Entity,
  component: ComponentDefinition<T & { parent?: Entity }>
): Generator<Entity> {
  const entities = new Map(engine.getEntitiesWith(component))
  return genEntityTree(entity, entities)
}

/**
 * Remove all components of each entity in the tree made with Transform parenting
 * @param engine - the engine running the entities
 * @param firstEntity - the root entity of the tree
 * @public
 */
export function removeEntityWithChildren(engine: IEngine, entity: Entity) {
  const Transform = components.Transform(engine)
  for (const _entity of getComponentEntityTree(engine, entity, Transform)) {
    engine.removeEntity(_entity)
  }
}
