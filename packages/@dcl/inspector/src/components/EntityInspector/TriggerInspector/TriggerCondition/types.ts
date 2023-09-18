import type { Entity } from '@dcl/ecs'
import type { States, Trigger, TriggerCondition } from '@dcl/asset-packs'

export type Props = {
  trigger: Trigger
  availableStates: Map<Entity, { name: string; states: States['value'] }>
  onUpdateConditions: (conditions: TriggerCondition[]) => void
}
