import { YGDisplay } from '@dcl/ecs'
import { ReactEcs } from '../react-ecs'
import { CommonProps, EntityPropTypes } from './types'
import { parseUiTransform, CANVAS_ROOT_ENTITY } from './uiTransform'
import { parseUiBackground } from './uiBackground'

export * from './types'
export { CANVAS_ROOT_ENTITY }
export * from './uiTransform/types'
export * from './listeners/types'
export * from './uiInput/types'
export * from './uiBackground/types'

/**
 * @public
 */
export function UiEntity(props: EntityPropTypes & Partial<CommonProps>) {
  const { uiTransform, uiBackground, ...otherProps } = props
  const uiTransformProps = parseUiTransform(uiTransform)
  const uiBackgroundProps = uiBackground
    ? { uiBackground: parseUiBackground(uiBackground) }
    : undefined

  return (
    <entity
      uiTransform={uiTransformProps}
      {...uiBackgroundProps}
      {...otherProps}
    />
  )
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
