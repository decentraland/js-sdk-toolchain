import { Entity, IEngine } from '@dcl/ecs'
import * as components from '@dcl/ecs/dist/components'

import { EditorComponentIds, EditorComponents } from '../components'

export function setParent(engine: IEngine) {
  return function setParent(entity: Entity, parent: Entity) {
    const EntityNode = engine.getComponentOrNull(EditorComponentIds.EntityNode) as EditorComponents['EntityNode']
    const Transform = engine.getComponentOrNull("core::Transform")

    EntityNode.getOrCreateMutable(entity).parent = parent

    // TODO: Why we need this ? Doesnt the system do this ?
    // EntityNode is adding some complexity here, maybe we can go back to have only a Transform.
    const transform = Transform.getMutableOrNull(entity)
    if (transform) transform.parent = parent
  }
}

export default setParent
