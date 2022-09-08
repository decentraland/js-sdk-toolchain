import { UiTransformProps } from './uiTransform'

/**
 * @public
 */
export type EntityPropTypes = {
  uiTransform?: UiTransformProps
}
export type Key = number | string
export type Children = any
export type CommonProps = {
  key?: Key
  children?: Children
}

export * from './uiTransform/types'
