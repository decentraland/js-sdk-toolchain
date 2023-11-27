import { ActionPayload, ActionType } from '@dcl/asset-packs'

export function isValid(
  payload: Partial<ActionPayload<ActionType.PLAY_AUDIO_STREAM>>
): payload is ActionPayload<ActionType.PLAY_AUDIO_STREAM> {
  return !!payload.url
}
