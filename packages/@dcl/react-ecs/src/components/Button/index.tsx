import { parseProps } from '../utils'
import { ReactEcs } from '../../react-ecs'
import { EntityPropTypes } from '../types'
import { UiButtonProps } from './types'
import { parseUiBackground } from '../uiBackground'
import { parseUiTransform } from '../uiTransform'

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
export function Button(props: EntityPropTypes & UiButtonProps) {
  const { uiTransform, uiBackground, onMouseDown, onMouseUp, ...uiTextProps } =
    props
  const buttonProps = getButtonProps(props)
  const uiBackgroundProps = {
    ...buttonProps.uiBackground,
    ...parseUiBackground(uiBackground ?? {})
  }
  const textProps = {
    ...buttonProps.uiText,
    ...uiTextProps
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
