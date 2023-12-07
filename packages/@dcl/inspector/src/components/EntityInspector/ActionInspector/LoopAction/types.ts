import { Action, ActionPayload, ActionType } from '@dcl/asset-packs'

export interface Props<T extends ActionPayload<ActionType.START_LOOP | ActionType.STOP_LOOP>> {
  availableActions: Action[]
  value: T
  onUpdate: (value: T) => void
}
