import { UiBackgroundProps } from './uiBackground/types'
import { UiTextProps } from './uiText/types'
import { UiTransformProps } from './uiTransform/types'

/**
 * @public
 */
export type EntityPropTypes = {
  uiTransform?: UiTransformProps
  uiText?: UiTextProps
  uiBackground?: UiBackgroundProps
}

export type Key = number | string
export type Children = any
export type CommonProps = {
  key: Key
  children: Children
}
