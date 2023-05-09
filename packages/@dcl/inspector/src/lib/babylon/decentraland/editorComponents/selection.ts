import { ComponentType } from '@dcl/ecs'
import { EcsEntity } from '../EcsEntity'
import type { ComponentOperation } from '../component-operations'
import { getGizmoManager } from '../gizmo-manager'

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
  const gm = getGizmoManager(context.scene, context.operations)
  let processedSomeEntity = false

  for (const [_entity] of context.engine.getEntitiesWith(context.editorComponents.Selection)) {
    processedSomeEntity = true
    if (entity.entityId === _entity) {
      gm.setEntity(entity)
      gm.gizmoManager.positionGizmoEnabled = value?.gizmo === 0
      gm.gizmoManager.rotationGizmoEnabled = value?.gizmo === 1
      gm.gizmoManager.scaleGizmoEnabled = value?.gizmo === 2
      return
    }
  }

  if (!processedSomeEntity) {
    gm.unsetEntity()
    gm.gizmoManager.positionGizmoEnabled = false
    gm.gizmoManager.rotationGizmoEnabled = false
    gm.gizmoManager.scaleGizmoEnabled = false
  }
}
