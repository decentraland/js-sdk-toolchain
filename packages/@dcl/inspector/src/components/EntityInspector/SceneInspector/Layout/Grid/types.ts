import { Coords } from '@dcl/ecs'

export type Props = {
  coords: Coords[]
  isBaseTile?: (coord: Coords) => boolean
  isTileDisabled?: (coord: Coords) => boolean
  handleTileClick?: (coord: Coords) => void
  maxTileSize?: number // in %
  minTileSize?: number // in %
  visualThreshold?: number // in %
}
