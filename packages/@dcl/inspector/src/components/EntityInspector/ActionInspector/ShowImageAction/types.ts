import { ActionPayload, ActionType } from '@dcl/asset-packs'

export interface Props {
  value: Partial<ActionPayload<ActionType.SHOW_IMAGE>>
  onUpdate: (value: ActionPayload<ActionType.SHOW_IMAGE>) => void
}
