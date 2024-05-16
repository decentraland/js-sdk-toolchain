import { Layout } from '../../../../lib/utils/layout'

export type Props = {
  value: Layout
  onChange: (value: Layout) => void
}

export enum Mode {
  GRID,
  ADVANCED
}

export enum GridError {
  NOT_CONNECTED = 1, // start from 1 so we can use GridError as boolean type
  NUMBER_OF_PARCELS,
  MISSING_BASE_PARCEL
}

export const MAX_AXIS_PARCELS = 32
export const TILE_OPTIONS = Array.from({ length: MAX_AXIS_PARCELS }, (_, i) => ({
  value: i + 1
}))
