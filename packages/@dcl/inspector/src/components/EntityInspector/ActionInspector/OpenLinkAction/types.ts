import { ActionPayload, ActionType } from '@dcl/asset-packs'

export interface Props {
  value: Partial<ActionPayload<ActionType.OPEN_LINK>>
  onUpdate: (value: ActionPayload<ActionType.OPEN_LINK>) => void
}
