import { PBBillboard, BillboardMode, ComponentType } from '@dcl/ecs'
import type { ComponentOperation } from '../component-operations'

export const putBillboardComponent: ComponentOperation = (entity, component) => {
  if (component.componentType === ComponentType.LastWriteWinElementSet) {
    const newValue = component.getOrNull(entity.entityId) as PBBillboard | null
    const newBillboardMode = newValue ? (newValue?.billboardMode === BillboardMode.BM_ALL ? 7 : 2) : 0
    entity.billboardMode = newBillboardMode || 0
  }
}
