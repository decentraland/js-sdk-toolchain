import { ActionPayload } from '@dcl/asset-packs'

export interface Props {
  tween: ActionPayload['start_tween']
  onUpdateTween: (tween: ActionPayload['start_tween']) => void
}
