import { Entity } from '@dcl/ecs'
import type { Trigger, TriggerCondition, TriggerConditionType } from '@dcl/asset-packs'

export type Props = {
  trigger: Trigger
  availableStates: Map<number, { name: string; states: string[] }>
  availableConditions: Map<
    Entity,
    {
      name: string
      conditions: { value: { id: number; type: TriggerConditionType }; text: string }[]
    }
  >
  onChangeOperation: React.ChangeEventHandler<HTMLSelectElement>
  onUpdateConditions: (conditions: TriggerCondition[]) => void
}
