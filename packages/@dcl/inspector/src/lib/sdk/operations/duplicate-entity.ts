import { Entity, IEngine, Transform as TransformEngine, NetworkEntity as NetworkEntityEngine } from '@dcl/ecs'
import { clone } from '@dcl/asset-packs'
import { EditorComponentNames, EditorComponents } from '../components'
import { pushChild } from '../nodes'
import updateSelectedEntity from './update-selected-entity'

export function duplicateEntity(engine: IEngine) {
  return function duplicateEntity(entity: Entity) {
    const Transform = engine.getComponent(TransformEngine.componentId) as typeof TransformEngine
    const Nodes = engine.getComponent(EditorComponentNames.Nodes) as EditorComponents['Nodes']
    const Triggers = engine.getComponent(EditorComponentNames.Triggers) as EditorComponents['Triggers']
    const NetworkEntity = engine.getComponent(NetworkEntityEngine.componentId) as typeof NetworkEntityEngine

    const { entities } = clone(entity, engine as any, Transform as any, Triggers as any) as {
      entities: Map<Entity, Entity>
    }

    for (const [original, duplicate] of Array.from(entities.entries()).reverse()) {
      if (NetworkEntity.has(original)) {
        NetworkEntity.createOrReplace(duplicate, { entityId: duplicate, networkId: 0 })
      }

      const transform = Transform.getMutableOrNull(duplicate)
      if (transform === null || !transform.parent) {
        Nodes.createOrReplace(engine.RootEntity, { value: pushChild(engine, engine.RootEntity, duplicate) })
      } else {
        const parent = entities.get(transform.parent) || transform.parent
        Nodes.createOrReplace(engine.RootEntity, { value: pushChild(engine, parent, duplicate) })
      }
    }

    const duplicate = entities.get(entity)!
    updateSelectedEntity(engine)(duplicate)
    return duplicate
  }
}

export default duplicateEntity
