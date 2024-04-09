import { ActionPayload, ActionType } from '@dcl/asset-packs'

export interface Props {
  value: Partial<ActionPayload<ActionType.FOLLOW_PLAYER>>
  onUpdate: (value: ActionPayload<ActionType.FOLLOW_PLAYER>) => void
}
