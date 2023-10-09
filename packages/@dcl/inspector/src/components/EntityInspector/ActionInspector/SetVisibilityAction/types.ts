import { ActionPayload, ActionType } from '@dcl/asset-packs'

export interface Props {
  value: Partial<ActionPayload<ActionType.SET_VISIBILITY>>
  onUpdate: (value: ActionPayload<ActionType.SET_VISIBILITY>) => void
}
