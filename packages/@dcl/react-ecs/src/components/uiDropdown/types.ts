import { PBUiDropdown } from '@dcl/ecs'

/**
 * @public
 */
export type UiDropdownProps = Partial<PBUiDropdown> & {
  onChange?(value: number): void
}

/**
 * @internal
 */
export type UiDropdownComponent = {
  uiDropdown?: PBUiDropdown
}
