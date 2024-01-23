import { ComponentType } from '@dcl/ecs'
import type { ComponentOperation } from '../component-operations'
import { updateGizmoManager } from './selection'

export const putHideComponent: ComponentOperation = (entity, component) => {
  if (!entity.meshRenderer) return

  if (component.componentType === ComponentType.LastWriteWinElementSet) {
    const context = entity.context.deref()!
    const { value: isHidden } = (component.getOrNull(entity.entityId) as { value: boolean } | null) ?? {}
    entity.meshRenderer.visibility = isHidden ? 0 : 1
    if (isHidden) {
      context.gizmos.unsetEntity()
    } else {
      const selectionValue = context.editorComponents.Selection.getOrNull(entity.entityId)
      updateGizmoManager(entity, selectionValue)
    }
  }
}
