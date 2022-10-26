// import { Listeners } from './listeners/types'
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
} // & Listeners
// TODO: Add Listeners when onClick its handled Unity Side

export type Key = number | string
export type Children = any
export type CommonProps = {
  key: Key
  children: Children
}
