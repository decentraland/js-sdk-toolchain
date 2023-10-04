import { ActionPayload, ActionType } from '@dcl/asset-packs'

export interface Props {
  value: Partial<ActionPayload<ActionType.PLAY_SOUND>>
  onUpdate: (value: ActionPayload<ActionType.PLAY_SOUND>) => void
}
