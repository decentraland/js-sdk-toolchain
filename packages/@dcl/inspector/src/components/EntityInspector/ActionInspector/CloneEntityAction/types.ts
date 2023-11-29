import { ActionPayload, ActionType } from '@dcl/asset-packs'

export interface Props {
  value: Partial<ActionPayload<ActionType.CLONE_ENTITY>>
  onUpdate: (value: ActionPayload<ActionType.CLONE_ENTITY>) => void
}
