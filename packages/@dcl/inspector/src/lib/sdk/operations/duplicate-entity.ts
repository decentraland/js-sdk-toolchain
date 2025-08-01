import { Entity, IEngine, Transform as TransformEngine, Name as NameEngine } from '@dcl/ecs'
import * as components from '@dcl/ecs/dist/components'
import { clone } from '@dcl/asset-packs'
import { EditorComponentNames, EditorComponents } from '../components'
import { pushChild } from '../nodes'
import updateSelectedEntity from './update-selected-entity'
import { generateUniqueName } from './add-child'
import { createEnumEntityId } from '../enum-entity'

export function duplicateEntity(engine: IEngine) {
  const enumEntityId = createEnumEntityId(engine)
  return function duplicateEntity(entity: Entity) {
    const Transform = engine.getComponent(TransformEngine.componentId) as typeof TransformEngine
    const Nodes = engine.getComponent(EditorComponentNames.Nodes) as EditorComponents['Nodes']
    const Triggers = engine.getComponent(EditorComponentNames.Triggers) as EditorComponents['Triggers']
    const Name = engine.getComponent(NameEngine.componentName) as typeof NameEngine
    const NetworkEntity = components.NetworkEntity(engine)

    const { entities, cloned } = clone(entity, engine as any, Transform as any, Triggers as any) as {
      entities: Map<Entity, Entity>
      cloned: Entity
    }

    for (const [original, duplicate] of Array.from(entities.entries()).reverse()) {
      if (NetworkEntity.has(original)) {
        NetworkEntity.createOrReplace(duplicate, { entityId: enumEntityId.getNextEnumEntityId(), networkId: 0 })
      }

      const originalName = Name.getOrNull(original)?.value
      Name.createOrReplace(duplicate, { value: generateUniqueName(engine, Name, originalName || '') })

      const transform = Transform.getMutableOrNull(duplicate)
      if (transform === null || !transform.parent) {
        Nodes.createOrReplace(engine.RootEntity, { value: pushChild(engine, engine.RootEntity, duplicate) })
      } else {
        const parent = entities.get(transform.parent) || transform.parent
        Nodes.createOrReplace(engine.RootEntity, { value: pushChild(engine, parent, duplicate) })
      }
    }

    updateSelectedEntity(engine)(cloned)
    return cloned
  }
}

export default duplicateEntity
