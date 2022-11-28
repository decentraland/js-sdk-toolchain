import { YGDisplay } from '@dcl/ecs'
import { ReactEcs } from '../react-ecs'
import { CommonProps, EntityPropTypes } from './types'
import { parseUiTransform, CANVAS_ROOT_ENTITY } from './uiTransform'

export * from './types'
export { CANVAS_ROOT_ENTITY }
export * from './uiTransform/types'
export * from './listeners/types'

/**
 * @public
 */
export function UiEntity(props: EntityPropTypes & Partial<CommonProps>) {
  const { uiTransform, ...otherProps } = props
  const uiTransformProps = parseUiTransform(uiTransform)

  return <entity uiTransform={uiTransformProps} {...otherProps} />
}

export type ContainerPropTypes = Partial<CommonProps> &
  EntityPropTypes['uiTransform']

export function Container({ width, height, children }: ContainerPropTypes) {
  return (
    <UiEntity uiTransform={{ width, height, display: YGDisplay.YGD_FLEX }}>
      {children}
    </UiEntity>
  )
}
