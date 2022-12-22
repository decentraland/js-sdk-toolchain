import { PBUiInput } from '@dcl/ecs'

/**
 * @public
 */
export type UiInputProps = PBUiInput & {
  onChange?(value: string): void
}

/**
 * @internal
 */
export type UiInputComponent = {
  uiInput?: PBUiInput
}
