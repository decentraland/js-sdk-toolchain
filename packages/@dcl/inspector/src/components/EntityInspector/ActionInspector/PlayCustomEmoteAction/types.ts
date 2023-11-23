import { ActionPayload, ActionType } from '@dcl/asset-packs'

export interface Props {
  value: Partial<ActionPayload<ActionType.PLAY_CUSTOM_EMOTE>>
  onUpdate: (value: ActionPayload<ActionType.PLAY_CUSTOM_EMOTE>) => void
}
