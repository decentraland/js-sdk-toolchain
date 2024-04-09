import { Action, ActionPayload, ActionType } from '@dcl/asset-packs'

export interface Props {
  availableActions: Action[]
  value: Partial<ActionPayload<ActionType.RANDOM>>
  onUpdate: (value: ActionPayload<ActionType.RANDOM>) => void
}
