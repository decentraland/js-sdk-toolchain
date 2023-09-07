import type { Trigger } from '@dcl/asset-packs'

export type Props = {
  trigger: Trigger
  onChangeTriggerType: React.ChangeEventHandler<HTMLSelectElement>
  onAddNewTriggerAction: React.MouseEventHandler<HTMLButtonElement>
  onRemoveTriggerEvent: React.MouseEventHandler<HTMLButtonElement>
  children: JSX.Element | JSX.Element[]
}
