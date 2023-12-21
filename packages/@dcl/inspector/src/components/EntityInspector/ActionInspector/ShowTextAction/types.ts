import { ActionPayload, ActionType } from '@dcl/asset-packs'

export interface Props {
  value: Partial<ActionPayload<ActionType.SHOW_TEXT>>
  onUpdate: (value: ActionPayload<ActionType.SHOW_TEXT>) => void
}
