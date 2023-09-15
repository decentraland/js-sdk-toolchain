import type { Entity } from '@dcl/ecs'
import type { States, TriggerCondition } from '@dcl/asset-packs'

export type Props = {
  condition: TriggerCondition
  availableStates: Map<Entity, { name: string; state: States }>
  onChangeEntity: React.ChangeEventHandler<HTMLSelectElement>
  onChangeConditionType: React.ChangeEventHandler<HTMLSelectElement>
  onChangeConditionValue: React.ChangeEventHandler<HTMLSelectElement>
  onRemoveTriggerCondition: React.MouseEventHandler<HTMLButtonElement>
}
