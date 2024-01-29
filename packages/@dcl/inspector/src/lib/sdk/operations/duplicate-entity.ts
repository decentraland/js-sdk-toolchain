import {
  Entity,
  IEngine,
  getComponentEntityTree,
  Transform as TransformEngine,
  NetworkEntity as NetworkEntityEngine
} from '@dcl/ecs'
import { clone } from '@dcl/asset-packs'
import { EditorComponentNames, EditorComponents } from '../components'
import { addNode, pushChild } from '../nodes'
import updateSelectedEntity from './update-selected-entity'

export function duplicateEntity(engine: IEngine) {
  return function duplicateEntity(entity: Entity) {
    const originalToDuplicate: Map<Entity, Entity> = new Map()
    const Transform = engine.getComponent(TransformEngine.componentId) as typeof TransformEngine
    const Nodes = engine.getComponent(EditorComponentNames.Nodes) as EditorComponents['Nodes']
    const Triggers = engine.getComponent(EditorComponentNames.Triggers) as EditorComponents['Triggers']
    const NetworkEntity = engine.getComponent(NetworkEntityEngine.componentId) as typeof NetworkEntityEngine

    for (const original of getComponentEntityTree(engine, entity, Transform)) {
      const duplicate = clone(original, engine as any, Triggers as any)
      originalToDuplicate.set(original, duplicate)
      Nodes.createOrReplace(engine.RootEntity, { value: addNode(engine, duplicate) })
      if (NetworkEntity.has(original)) {
        NetworkEntity.createOrReplace(duplicate, { entityId: duplicate, networkId: 0 })
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
