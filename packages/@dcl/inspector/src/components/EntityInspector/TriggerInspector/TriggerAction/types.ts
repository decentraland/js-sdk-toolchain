import type { Entity } from '@dcl/ecs'
import type { Action, Trigger } from '@dcl/asset-packs'

export type Props = {
  trigger: Trigger
  availableActions: Map<Entity, { name: string; action: Action[] }>
  onChangeEntity: (e: React.ChangeEvent<HTMLSelectElement>, actionId: number) => void
  onChangeAction: (e: React.ChangeEvent<HTMLSelectElement>, actionId: number) => void
  onAddTriggerAction: React.MouseEventHandler<HTMLButtonElement>
  onRemoveTriggerAction: (e: React.MouseEvent<HTMLButtonElement>, actionId: number) => void
}
