import { ComponentType, PBPointerEvents } from '@dcl/ecs'
import type { ComponentOperation } from '../component-operations'
import { EcsEntity } from '../EcsEntity'

export const putPointerEventsComponent: ComponentOperation = (entity, component) => {
  if (component.componentType === ComponentType.LastWriteWinElementSet) {
    const newValue = component.getOrNull(entity.entityId) as PBPointerEvents | null

    // update value
    entity.ecsComponentValues.pointerEvents = newValue || undefined

    // side effects
    if (entity.meshRenderer) {
      entity.meshRenderer.isPickable = isEntityPickable(entity)
    }
  }
}

// returns true if the entity has PointerEvents
export function isEntityPickable(entity: EcsEntity) {
  return !!entity.ecsComponentValues.pointerEvents
}
