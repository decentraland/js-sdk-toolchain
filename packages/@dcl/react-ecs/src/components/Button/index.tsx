import { PBUiText } from '@dcl/ecs'

import { ReactEcs } from '../../react-ecs'
import { getFont, getFontSize, getTextAlign } from '../Label/utils'
import { parseUiBackground } from '../uiBackground'
import { parseUiTransform } from '../uiTransform'
import { UiButtonProps } from './types'

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
  const { uiTransform, uiBackground, onMouseDown, onMouseUp, ...otherProps } = props
  const buttonProps = getButtonProps(props)
  const uiBackgroundProps = parseUiBackground({
    ...buttonProps.uiBackground,
    ...uiBackground
  })
  const { font, textAlign, fontSize, ...uiTexProps } = otherProps
  const textProps: PBUiText = {
    ...buttonProps.uiText,
    ...uiTexProps,
    ...getFont(font),
    ...getTextAlign(textAlign),
    ...getFontSize(fontSize)
  }
  const uiTransformProps = parseUiTransform({
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
      uiTransform={uiTransformProps}
      uiText={textProps}
      uiBackground={uiBackgroundProps}
    />
  )
}
