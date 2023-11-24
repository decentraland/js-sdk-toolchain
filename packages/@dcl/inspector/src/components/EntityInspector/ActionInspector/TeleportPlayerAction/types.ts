import { ActionPayload, ActionType } from '@dcl/asset-packs'

export interface Props {
  value: Partial<ActionPayload<ActionType.TELEPORT_PLAYER>>
  onUpdate: (value: ActionPayload<ActionType.TELEPORT_PLAYER>) => void
}
