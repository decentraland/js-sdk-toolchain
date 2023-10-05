import { ActionPayload, ActionType } from '@dcl/asset-packs'

export function isValid(
  payload: Partial<ActionPayload<ActionType.PLAY_ANIMATION>>
): payload is ActionPayload<ActionType.PLAY_ANIMATION> {
  return !!payload.animation
}
