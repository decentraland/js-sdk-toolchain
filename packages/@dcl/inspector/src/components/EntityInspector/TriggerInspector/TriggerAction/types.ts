import type { Entity } from '@dcl/ecs'
import type { Action, TriggerAction } from '@dcl/asset-packs'

export type Props = {
  action: TriggerAction
  availableActions: Map<Entity, { name: string; action: Action[] }>
  onChangeEntity: React.ChangeEventHandler<HTMLSelectElement>
  onChangeAction: React.ChangeEventHandler<HTMLSelectElement>
  onRemoveTriggerAction: React.MouseEventHandler<HTMLButtonElement>
}
