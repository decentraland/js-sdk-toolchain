import { ReactEcs } from '../react-ecs'
import { CommonProps, EntityPropTypes } from './types'
import { parseUiTransform } from './uiTransform'

export * from './types'
export * from './uiTransform/types'

/**
 * @public
 */
export function Entity(props: EntityPropTypes & CommonProps) {
  const { uiTransform, ...otherProps } = props
  const uiTransformProps = parseUiTransform(uiTransform)
  return <entity uiTransform={uiTransformProps} {...otherProps} />
}

export type ContainerPropTypes = CommonProps & {
  width?: number
  height?: number
}
export function Container({ width, height, children }: ContainerPropTypes) {
  return <Entity uiTransform={{ width, height }}>{children}</Entity>
}
