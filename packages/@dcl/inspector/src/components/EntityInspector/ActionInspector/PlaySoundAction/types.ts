import { ActionPayload } from '@dcl/asset-packs'

export interface Props {
  value: ActionPayload['play_sound']
  onUpdate: (value: ActionPayload['play_sound']) => void
}
