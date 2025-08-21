import { AnimationGroup } from '@babylonjs/core'
import { ActionPayload, ActionType } from '@dcl/asset-packs'

export interface Props {
  value: Partial<ActionPayload<ActionType.PLAY_ANIMATION>>
  animations: AnimationGroup[]
  onUpdate: (value: ActionPayload<ActionType.PLAY_ANIMATION>) => void
}

export enum PLAY_MODE {
  PLAY_ONCE = 'play-once',
  LOOP = 'loop'
}

export const PLAY_MODE_OPTIONS = [
  {
    label: 'Play Once',
    value: PLAY_MODE.PLAY_ONCE
  },
  {
    label: 'Loop',
    value: PLAY_MODE.LOOP
  }
]
