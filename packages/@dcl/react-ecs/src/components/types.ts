import { Listeners } from './listeners/types'
import { UiBackgroundProps } from './uiBackground/types'
import { UiTransformProps } from './uiTransform/types'

/**
 * @public
 */
export type EntityPropTypes = {
  uiTransform?: UiTransformProps
  uiBackground?: UiBackgroundProps
} & Listeners &
  Pick<CommonProps, 'key'>

export type Key = number | string
export type Children = unknown
export type CommonProps = {
  key?: Key
  children?: Children
}
