import { ActionPayload, ActionType, ProximityLayer } from '@dcl/asset-packs'

export interface Props {
  value: Partial<ActionPayload<ActionType.DAMAGE>>
  onUpdate: (value: ActionPayload<ActionType.DAMAGE>) => void
}

export const LayerOptions = [
  {
    value: ProximityLayer.ALL,
    label: 'All'
  },
  {
    value: ProximityLayer.PLAYER,
    label: 'Player'
  },
  {
    value: ProximityLayer.NON_PLAYER,
    label: 'Non Player'
  }
]
