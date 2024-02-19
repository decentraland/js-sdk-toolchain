import { PBUiDropdown } from '@dcl/ecs'

import { parseProps } from '../utils'
import { ReactEcs } from '../../react-ecs'
import { UiDropdownProps } from './types'
import { getFont, getFontSize, getTextAlign } from '../Label/utils'

function parseUiDropdown(props: UiDropdownProps): PBUiDropdown {
  const { textAlign, font, fontSize, ...otherProps } = props
  return {
    acceptEmpty: false,
    options: [],
    selectedIndex: props.acceptEmpty ? -1 : 0,
    disabled: false,
    ...otherProps,
    ...getTextAlign(textAlign),
    ...getFont(font),
    ...getFontSize(fontSize)
  }
}

/**
 * @public
 * Dropdown component
 *
 * A dropdown allows a user to select a value from a series of options.
 *
 * @example
 * <Dropdown
    options={['Red', 'Blue']}
    color={Color4.Red()}
    font="sans-serif"
    fontSize={14}
    selectedIndex={value}
    onChange={(index) => value = index}
  />
 *
 * @category Component
 */
/* @__PURE__ */
export function Dropdown(props: UiDropdownProps) {
  const { uiTransform, uiBackground, onMouseDown, onMouseUp, ...otherProps } = props
  const dropdownProps = parseUiDropdown(otherProps)
  const commonProps = parseProps({
    uiTransform,
    uiBackground,
    onMouseDown,
    onMouseUp
  })
  return <entity {...commonProps} uiDropdown={dropdownProps} />
}
