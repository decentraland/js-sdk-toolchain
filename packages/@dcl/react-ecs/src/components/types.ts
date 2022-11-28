import { PBUiBackground, PBUiText } from '@dcl/ecs/dist/components'
import { UiTransformProps } from './uiTransform/types'

/**
 * @public
 */
export type EntityPropTypes = {
  uiTransform?: UiTransformProps
  uiText?: PBUiText
  uiBackground?: PBUiBackground
} // & Listeners
// TODO: Add Listeners when onClick its handled Unity Side

export type Key = number | string
export type Children = any
export type CommonProps = {
  key: Key
  children: Children
}
