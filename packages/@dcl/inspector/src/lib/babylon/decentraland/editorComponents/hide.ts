import { ComponentType } from '@dcl/ecs'
import type { ComponentOperation } from '../component-operations'
import { updateGizmoManager } from './selection'

export const putHideComponent: ComponentOperation = (entity, component) => {
  if (component.componentType === ComponentType.LastWriteWinElementSet) {
    const context = entity.context.deref()!
    const isHidden = component.getOrNull(entity.entityId)
    entity.setEnabled(!isHidden)
    if (isHidden) {
      context.gizmos.unsetEntity()
    } else {
      const selectionValue = context.editorComponents.Selection.getOrNull(entity.entityId)
      updateGizmoManager(entity, selectionValue)
    }
  }
}
