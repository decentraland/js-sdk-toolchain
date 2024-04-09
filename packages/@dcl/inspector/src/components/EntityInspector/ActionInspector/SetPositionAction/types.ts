import { ActionPayload, ActionType } from '@dcl/asset-packs'

export interface Props {
  value: Partial<ActionPayload<ActionType.SET_POSITION>>
  onUpdate: (value: ActionPayload<ActionType.SET_POSITION>) => void
}
