import { PBUiText } from '@dcl/ecs'

import { ReactEcs } from '../../react-ecs'
import { getFont, getTextAlign } from '../Label/utils'
import { EntityPropTypes } from '../types'
import { parseUiBackground } from '../uiBackground'
import { parseUiTransform } from '../uiTransform'
import { UiButtonProps } from './types'

function getButtonProps(props: EntityPropTypes & UiButtonProps) {
  if (props.type === 'primary') {
    return {
      uiBackground: { color: { r: 0.98, g: 0.17, b: 0.33, a: 1 } },
      uiText: { color: { r: 1, g: 1, b: 1, a: 1 } }
    }
  }
  if (props.type === 'secondary') {
    return {
      uiBackground: { color: { r: 1, g: 1, b: 1, a: 1 } },
      uiText: { color: { r: 0.98, g: 0.17, b: 0.33, a: 1 } }
    }
  }
  return {}
}

/**
 * @public
 */
/*#__PURE__*/
export function Button(props: EntityPropTypes & UiButtonProps) {
  const { uiTransform, uiBackground, onMouseDown, onMouseUp, ...otherProps } =
    props
  const buttonProps = getButtonProps(props)
  const uiBackgroundProps = parseUiBackground({
    ...buttonProps.uiBackground,
    ...uiBackground
  })
  const { font, textAlign, ...uiTexProps } = otherProps
  const textProps: PBUiText = {
    ...buttonProps.uiText,
    ...uiTexProps,
    ...getFont(font),
    ...getTextAlign(textAlign)
  }
  const uiTransformProps = parseUiTransform({
    height: 36,
    ...uiTransform
  })
  return (
    <entity
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      uiTransform={uiTransformProps}
      uiText={textProps}
      uiBackground={uiBackgroundProps}
    />
  )
}
