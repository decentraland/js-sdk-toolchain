import { ReactEcs } from '../react-ecs'
import { CommonProps, EntityPropTypes, YGDisplay } from './types'
import { parseUiTransform } from './uiTransform'

export * from './types'
export * from './uiTransform/types'

/**
 * @public
 */
export function UiEntity(props: EntityPropTypes & CommonProps) {
  const { uiTransform, ...otherProps } = props
  const uiTransformProps = parseUiTransform(uiTransform)
  return <entity uiTransform={uiTransformProps} {...otherProps} />
}

export type ContainerPropTypes = CommonProps & EntityPropTypes['uiTransform']
export function Container({ width, height, children }: ContainerPropTypes) {
  return (
    <UiEntity uiTransform={{ width, height, display: YGDisplay.YGDisplayFlex }}>
      {children}
    </UiEntity>
  )
}
