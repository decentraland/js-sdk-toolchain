import { PBUiText } from '@dcl/ecs'
import { UiBackgroundProps } from './uiBackground/types'
import { UiDropdownProps } from './uiDropdown/types'
import { UiInputProps } from './uiInput/types'
import { UiTransformProps } from './uiTransform/types'

/**
 * @public
 */
export type EntityPropTypes = {
  uiTransform?: UiTransformProps
  uiText?: PBUiText
  uiBackground?: UiBackgroundProps
  uiInput?: UiInputProps
  uiDropdown?: UiDropdownProps
} // & Listeners
// TODO: Add Listeners when onClick its handled Unity Side

export type Key = number | string
export type Children = any
export type CommonProps = {
  key: Key
  children: Children
}
