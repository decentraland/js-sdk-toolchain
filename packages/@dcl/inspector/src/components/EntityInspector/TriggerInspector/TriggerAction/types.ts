import type { Action, Trigger, TriggerAction } from '@dcl/asset-packs'

export type Props = {
  trigger: Trigger
  availableActions: Map<number, { name: string; actions: Action[] }>
  onUpdateActions: (actions: TriggerAction[]) => void
}
