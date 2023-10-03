import type { Trigger } from '@dcl/asset-packs'

export type Props = {
  trigger: Trigger
  availableTriggers: string[]
  onChangeTriggerType: React.ChangeEventHandler<HTMLSelectElement>
  onAddNewTriggerAction: React.MouseEventHandler<HTMLButtonElement>
  onAddNewTriggerCondition: React.MouseEventHandler<HTMLButtonElement>
  onRemoveTriggerEvent: React.MouseEventHandler<HTMLButtonElement>
  children: JSX.Element | JSX.Element[]
}
