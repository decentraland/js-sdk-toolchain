export type Props = {

}

export const MAX_ROW_PARCELS = 32
export const TILE_OPTIONS = Array.from({ length: MAX_ROW_PARCELS / 2 }, (_, i) => ({ value: 2 + 2 * i }))
