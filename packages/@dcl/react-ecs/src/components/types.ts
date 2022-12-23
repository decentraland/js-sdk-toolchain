import { PBUiText } from '@dcl/ecs'
import { Listeners } from './listeners/types'
import { UiBackgroundProps } from './uiBackground/types'
import { UiTransformProps } from './uiTransform/types'

/**
 * @public
 */
export type EntityPropTypes = {
  uiTransform?: UiTransformProps
  uiText?: PBUiText
  uiBackground?: UiBackgroundProps
} & Listeners

export type Key = number | string
export type Children = any
export type CommonProps = {
  key: Key
  children: Children
}
