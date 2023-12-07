import { ActionPayload, ActionType } from '@dcl/asset-packs'

export interface Props {
  value: Partial<ActionPayload<ActionType.MOVE_PLAYER>>
  onUpdate: (value: ActionPayload<ActionType.MOVE_PLAYER>) => void
}
