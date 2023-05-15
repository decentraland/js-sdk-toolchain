import { ComponentType } from '@dcl/ecs'
import { EcsEntity } from '../EcsEntity'
import type { ComponentOperation } from '../component-operations'

export const putEntitySelectedComponent: ComponentOperation = (entity, component) => {
  if (component.componentType === ComponentType.LastWriteWinElementSet) {
    const componentValue = component.getOrNull(entity.entityId) as { gizmo: number } | null
    if (entity.meshRenderer) {
      entity.meshRenderer.showBoundingBox = !!componentValue
    }

    updateGizmoManager(entity, componentValue)
  }
}

const updateGizmoManager = (entity: EcsEntity, value: { gizmo: number } | null) => {
  const context = entity.context.deref()!
  let processedSomeEntity = false

  for (const [_entity] of context.engine.getEntitiesWith(context.editorComponents.Selection)) {
    processedSomeEntity = true
    if (entity.entityId === _entity) {
      context.gizmos.setEntity(entity)
      const types = context.gizmos.getGizmoTypes()
      const type = types[value?.gizmo || 0]
      context.gizmos.setGizmoType(type)
      return
    }
  }

  if (!processedSomeEntity) {
    context.gizmos.unsetEntity()
  }
}
