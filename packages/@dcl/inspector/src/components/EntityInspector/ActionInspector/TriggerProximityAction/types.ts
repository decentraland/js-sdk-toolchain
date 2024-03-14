import { ActionPayload, ActionType } from '@dcl/asset-packs'

export interface Props {
  value: Partial<ActionPayload<ActionType.DAMAGE>>
  onUpdate: (value: ActionPayload<ActionType.DAMAGE>) => void
}
