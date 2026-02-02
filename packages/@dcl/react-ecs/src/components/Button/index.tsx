import { PBUiText } from '@dcl/ecs'

import { ReactEcs } from '../../react-ecs'
import { getFont, getFontSize, getTextAlign, getTextWrap } from '../Label/utils'
import { parseUiBackground } from '../uiBackground'
import { parseUiTransform } from '../uiTransform'
import { UiButtonProps } from './types'

// Default colors for Button
const DEFAULT_BORDER_COLOR = { r: 0.5, g: 0.5, b: 0.5, a: 1 } // Gray
const DEFAULT_BACKGROUND_COLOR = { r: 1, g: 1, b: 1, a: 1 } // White
const DEFAULT_TEXT_COLOR = { r: 0, g: 0, b: 0, a: 1 } // Black

function getButtonProps(props: UiButtonProps) {
  if (props.variant === 'secondary') {
    return {
      uiBackground: { color: { r: 1, g: 1, b: 1, a: 1 } },
      uiText: { color: { r: 0.98, g: 0.17, b: 0.33, a: 1 } }
    }
  }

  // 'primary' variant by default
  return {
    uiBackground: { color: { r: 0.98, g: 0.17, b: 0.33, a: 1 } },
    uiText: { color: { r: 1, g: 1, b: 1, a: 1 } }
  }
}

/**
 *
 * @public
 * Button component
 *
 * A Button indicates a possible user action.
 *
 * @example
 * <Button variant="primary" value="Click me!" />
 *
 * @category Component
 */
/* @__PURE__ */
export function Button(props: UiButtonProps) {
  const { uiTransform, uiBackground, onMouseDown, onMouseUp, onMouseEnter, onMouseLeave, ...otherProps } = props
  const buttonProps = getButtonProps(props)

  // If no uiBackground is provided, use default white background with black text
  // Otherwise, merge with button variant defaults
  const useDefaultBackground = uiBackground === undefined
  const uiBackgroundProps = parseUiBackground(
    useDefaultBackground
      ? { color: DEFAULT_BACKGROUND_COLOR }
      : { ...buttonProps.uiBackground, ...uiBackground }
  )

  const { font, textAlign, fontSize, textWrap, ...uiTexProps } = otherProps
  const textProps: PBUiText = {
    // Use black text for default white background, otherwise use variant text color
    ...(useDefaultBackground ? { color: DEFAULT_TEXT_COLOR } : buttonProps.uiText),
    ...uiTexProps,
    ...getFont(font),
    ...getTextAlign(textAlign),
    ...getFontSize(fontSize),
    ...getTextWrap(textWrap)
  }

  // Apply default uiTransform values for border properties
  const uiTransformProps = parseUiTransform({
    borderRadius: 25,
    borderWidth: 1,
    borderColor: DEFAULT_BORDER_COLOR,
    height: 36,
    ...uiTransform
  })

  if (!!props.disabled) {
    if (textProps.color) textProps.color.a /= 2
    if (uiBackgroundProps && uiBackgroundProps.color) uiBackgroundProps.color.a /= 2
  }

  return (
    <entity
      onMouseDown={!!props.disabled ? undefined : onMouseDown}
      onMouseUp={!!props.disabled ? undefined : onMouseUp}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      uiTransform={uiTransformProps}
      uiText={textProps}
      uiBackground={uiBackgroundProps}
    />
  )
}
