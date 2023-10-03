import { ActionPayload, ActionType } from '@dcl/asset-packs'

export function isValid(payload: ActionPayload<ActionType.PLAY_SOUND>) {
  return !!payload.src
}
