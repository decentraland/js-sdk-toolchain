import { ComponentType } from '@dcl/ecs'
import type { ComponentOperation } from '../component-operations'
import { setGizmoManager, unsetGizmoManager } from './selection'

export const putLockComponent: ComponentOperation = (entity, component) => {
  if (component.componentType === ComponentType.LastWriteWinElementSet) {
    const context = entity.context.deref()!
    const { value: isLocked } = (component.getOrNull(entity.entityId) as { value: boolean } | null) ?? {}
    entity.setLock(!!isLocked)
    if (isLocked) {
      unsetGizmoManager(entity)
    } else {
      const selectionValue = context.editorComponents.Selection.getOrNull(entity.entityId)
      if (selectionValue) setGizmoManager(entity, selectionValue)
    }
  }
}
