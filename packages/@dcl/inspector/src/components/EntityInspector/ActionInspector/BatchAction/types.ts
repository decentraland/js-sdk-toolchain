import { Action, ActionPayload, ActionType } from '@dcl/asset-packs'

export interface Props {
  availableActions: Action[]
  value: Partial<ActionPayload<ActionType.BATCH>>
  onUpdate: (value: ActionPayload<ActionType.BATCH>) => void
}
