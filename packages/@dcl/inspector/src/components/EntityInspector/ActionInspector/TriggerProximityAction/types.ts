import { ActionPayload, ActionType } from '@dcl/asset-packs'

export interface Props {
  value: Partial<ActionPayload<ActionType.TRIGGER_PROXIMITY>>
  onUpdate: (value: ActionPayload<ActionType.TRIGGER_PROXIMITY>) => void
}
