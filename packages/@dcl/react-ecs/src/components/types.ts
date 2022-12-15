import { PBUiBackground, PBUiText } from '@dcl/ecs'
import { UiInputProps } from './uiInput/types'
import { UiTransformProps } from './uiTransform/types'

/**
 * @public
 */
export type EntityPropTypes = {
  uiTransform?: UiTransformProps
  uiText?: PBUiText
  uiBackground?: PBUiBackground
  uiInput?: UiInputProps
} // & Listeners
// TODO: Add Listeners when onClick its handled Unity Side

export type Key = number | string
export type Children = any
export type CommonProps = {
  key: Key
  children: Children
}
