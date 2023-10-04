import { ActionPayload, ActionType } from '@dcl/asset-packs'

export function isValid(
  payload: Partial<ActionPayload<ActionType.PLAY_SOUND>>
): payload is ActionPayload<ActionType.PLAY_SOUND> {
  return !!payload.src
}
