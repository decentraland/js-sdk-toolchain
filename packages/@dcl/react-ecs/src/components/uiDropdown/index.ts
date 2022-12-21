import { PBUiDropdown } from '@dcl/ecs'
import { UiDropdownProps } from './types'

/**
 *
 * @public
 */
export function parseUiDropdown(props: UiDropdownProps): PBUiDropdown {
  return {
    acceptEmpty: false,
    options: [],
    selectedIndex: props.acceptEmpty ? -1 : 0,
    disabled: false,
    ...props
  }
}
