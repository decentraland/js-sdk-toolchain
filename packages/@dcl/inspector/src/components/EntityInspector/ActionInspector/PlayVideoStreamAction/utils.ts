import { ActionPayload, ActionType } from '@dcl/asset-packs'

export function isValid(
  payload: Partial<ActionPayload<ActionType.PLAY_VIDEO_STREAM>>
): payload is ActionPayload<ActionType.PLAY_VIDEO_STREAM> {
  return payload.dclCast || !!payload.src
}
