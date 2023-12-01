import { ActionPayload, ActionType } from '@dcl/asset-packs'

export interface Props {
  value: Partial<ActionPayload<ActionType.PLAY_AUDIO_STREAM>>
  onUpdate: (value: ActionPayload<ActionType.PLAY_AUDIO_STREAM>) => void
}
