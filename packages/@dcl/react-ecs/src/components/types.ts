import { UiTextProps } from './uiText/types'
import { UiTransformProps } from './uiTransform/types'

/**
 * @public
 */
export type EntityPropTypes = {
  uiTransform?: UiTransformProps
  uiText?: UiTextProps
}

export type Key = number | string
export type Children = any
export type CommonProps = {
  key: Key
  children: Children
}

export * from './uiTransform/types'
