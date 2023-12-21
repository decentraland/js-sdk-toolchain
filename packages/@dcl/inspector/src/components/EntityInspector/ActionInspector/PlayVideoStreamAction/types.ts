import { ActionPayload, ActionType } from '@dcl/asset-packs'

export interface Props {
  value: Partial<ActionPayload<ActionType.PLAY_VIDEO_STREAM>>
  onUpdate: (value: ActionPayload<ActionType.PLAY_VIDEO_STREAM>) => void
}
