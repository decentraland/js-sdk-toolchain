import { ComponentType } from '@dcl/ecs'
import type { ComponentOperation } from '../component-operations'
import { Layout } from '../../../utils/layout'
import { getLayoutManager } from '../layout-manager'

export const putSceneComponent: ComponentOperation = (entity, component) => {
  if (component.componentType === ComponentType.LastWriteWinElementSet) {
    const value = component.getOrNull(entity.entityId) as { layout: Layout } | null
    if (!value) return

    const context = entity.context.deref()!

    // set layout
    const lm = getLayoutManager(context.scene)
    lm.setLayout(value.layout)
  }
}
