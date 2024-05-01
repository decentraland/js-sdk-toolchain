export type Grid = {
  rows: number
  columns: number
}

export type Props = {
  grid: Grid,
  maxTileSize?: number // in %
  minTileSize?: number // in %
  visualThreshold?: number // in %
}
