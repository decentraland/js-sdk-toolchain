import { useComponentInput } from "../../../../hooks/sdk/useComponentInput"

type GetInputProps = ReturnType<typeof useComponentInput>['getInputProps']

export type Props = ReturnType<GetInputProps> & {

}

export const MAX_AXIS_PARCELS = 32
export const AXIS_STEP = 2
export const TILE_OPTIONS = Array.from({ length: MAX_AXIS_PARCELS / AXIS_STEP }, (_, i) => ({
  value: AXIS_STEP + AXIS_STEP * i
}))
