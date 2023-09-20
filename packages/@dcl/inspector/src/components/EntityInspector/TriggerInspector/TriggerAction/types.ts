import type { Entity } from '@dcl/ecs'
import type { Action, Trigger, TriggerAction } from '@dcl/asset-packs'

export type Props = {
  trigger: Trigger
  availableActions: Map<Entity, { name: string; action: Action[] }>
  onUpdateActions: (actions: TriggerAction[]) => void
}
