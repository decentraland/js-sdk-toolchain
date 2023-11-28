import { Action, ActionPayload, ActionType } from '@dcl/asset-packs'

export interface Props<T extends ActionPayload<ActionType.START_DELAY | ActionType.STOP_DELAY>> {
  availableActions: Action[]
  value: T
  onUpdate: (value: T) => void
}
