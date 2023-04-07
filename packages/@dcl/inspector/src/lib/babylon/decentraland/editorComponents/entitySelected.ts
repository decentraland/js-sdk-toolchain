import { ComponentType } from '@dcl/ecs'
import type { ComponentOperation } from '../component-operations'
import { getGizmoManager } from '../gizmo-manager'

export const putEntitySelectedComponent: ComponentOperation = (entity, component) => {
  if (component.componentType === ComponentType.LastWriteWinElementSet) {
    const enabled = component.getOrNull(entity.entityId) as { gizmo: number } | null
    if (entity.meshRenderer) {
      entity.meshRenderer.showBoundingBox = !!enabled
    }
    const context = entity.context.deref()!

    const gm = getGizmoManager(context.scene)

    gm.setEntity(entity)

    gm.gizmoManager.positionGizmoEnabled = enabled?.gizmo === 0
    gm.gizmoManager.rotationGizmoEnabled = enabled?.gizmo === 1
    gm.gizmoManager.scaleGizmoEnabled = enabled?.gizmo === 2
  }
}
