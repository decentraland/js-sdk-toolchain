import { PBUiDropdown } from '@dcl/ecs'

import { parseProps } from '../utils'
import { ReactEcs } from '../../react-ecs'
import { EntityPropTypes } from '../types'
import { UiDropdownProps } from './types'
import { getFont, getTextAlign } from '../Label/utils'

function parseUiDropdown(props: UiDropdownProps): PBUiDropdown {
  return {
    acceptEmpty: false,
    options: [],
    selectedIndex: props.acceptEmpty ? -1 : 0,
    disabled: false,
    ...props,
    ...getTextAlign(props.textAlign),
    ...getFont(props.font)
  }
}

/**
 * @public
 */
/*#__PURE__*/
export function Dropdown(props: EntityPropTypes & UiDropdownProps) {
  const { uiTransform, uiBackground, onMouseDown, onMouseUp, ...otherProps } =
    props
  const dropdownProps = parseUiDropdown(otherProps)
  const commonProps = parseProps({
    uiTransform,
    uiBackground,
    onMouseDown,
    onMouseUp
  })
  return <entity {...commonProps} uiDropdown={dropdownProps} />
}
