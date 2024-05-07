import { useComponentInput } from "../../../../hooks/sdk/useComponentInput"

type GetInputProps = ReturnType<typeof useComponentInput>['getInputProps']

export type Props = ReturnType<GetInputProps> & {

}

export const MAX_ROW_PARCELS = 32
export const TILE_OPTIONS = Array.from({ length: MAX_ROW_PARCELS / 2 }, (_, i) => ({ value: 2 + 2 * i }))
