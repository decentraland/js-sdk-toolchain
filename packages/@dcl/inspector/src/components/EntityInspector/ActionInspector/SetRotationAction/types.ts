import { ActionPayload, ActionType } from '@dcl/asset-packs'

export interface Props {
  value: Partial<ActionPayload<ActionType.SET_ROTATION>>
  onUpdate: (value: ActionPayload<ActionType.SET_ROTATION>) => void
}
