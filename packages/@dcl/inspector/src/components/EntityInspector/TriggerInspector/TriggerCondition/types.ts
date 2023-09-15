import type { Entity } from '@dcl/ecs'
import type { States, Trigger } from '@dcl/asset-packs'

export type Props = {
  trigger: Trigger
  availableStates: Map<Entity, { name: string; state: States }>
  onChangeEntity: (e: React.ChangeEvent<HTMLSelectElement>, condtionId: number) => void
  onChangeConditionType: (e: React.ChangeEvent<HTMLSelectElement>, condtionId: number) => void
  onChangeConditionValue: (e: React.ChangeEvent<HTMLSelectElement>, condtionId: number) => void
  onAddTriggerCondition: React.MouseEventHandler<HTMLButtonElement>
  onRemoveTriggerCondition: (e: React.MouseEvent<HTMLButtonElement>, conditionId: number) => void
}
