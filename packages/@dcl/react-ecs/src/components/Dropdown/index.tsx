import { PBUiDropdown } from '@dcl/ecs'

import { parseProps } from '../utils'
import { ReactEcs } from '../../react-ecs'
import { UiDropdownProps } from './types'
import { getFont, getFontSize, getTextAlign } from '../Label/utils'

// Default colors for Dropdown
const DEFAULT_BORDER_COLOR = { r: 0.5, g: 0.5, b: 0.5, a: 1 } // Gray
const DEFAULT_BACKGROUND_COLOR = { r: 1, g: 1, b: 1, a: 1 } // White

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
  const { uiTransform, uiBackground, onMouseDown, onMouseUp, onMouseEnter, onMouseLeave, ...otherProps } = props
  const dropdownProps = parseUiDropdown(otherProps)

  // Apply default uiTransform values for border properties
  const uiTransformWithDefaults = {
    borderRadius: 15,
    borderWidth: 1,
    borderColor: DEFAULT_BORDER_COLOR,
    ...uiTransform
  }

  // Apply default uiBackground if not provided
  const uiBackgroundWithDefaults = uiBackground ?? { color: DEFAULT_BACKGROUND_COLOR }

  const commonProps = parseProps({
    uiTransform: uiTransformWithDefaults,
    uiBackground: uiBackgroundWithDefaults,
    onMouseDown,
    onMouseUp,
    onMouseEnter,
    onMouseLeave
  })
  return <entity {...commonProps} uiDropdown={dropdownProps} />
}
