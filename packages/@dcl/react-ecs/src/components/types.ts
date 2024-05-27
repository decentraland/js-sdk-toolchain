import { Listeners } from './listeners/types'
import { UiBackgroundProps } from './uiBackground/types'
import { UiTransformProps } from './uiTransform/types'

/**
 * @public
 * Common props to all components
 */
export interface EntityPropTypes extends Listeners {
  /** Layout component, to position things in the canvas */
  uiTransform?: UiTransformProps
  /** To define a background color or image */
  uiBackground?: UiBackgroundProps
  /** Uinique key to identiy elments when iterating arrays */
  key?: Key
}

/**
 * Keys help React identify which items have changed, are added, or are removed.
 * Keys should be given to the elements inside the array to give the elements a stable identity:
 * @public
 */
export type Key = number | string
export type Children = unknown

/**
 * unit value type. i.e. 'vw' || 'vh'
 * @public
 */
export type ScaleUnits = 'vw' | 'vh'

/**
 * unit value specified. i.e. 10 || '10vw' || '10vh'
 * @public
 */
export type ScaleUnit = `${number}${ScaleUnits}` | number

/**
 * context for applying a scale
 * @public
 */
export type ScaleContext = { width: number; height: number; ratio: number }
