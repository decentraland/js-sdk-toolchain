import { YGDisplay } from '@dcl/ecs'
import { ReactEcs } from '../react-ecs'
import { CommonProps, EntityPropTypes } from './types'
import { parseUiTransform, CANVAS_ROOT_ENTITY } from './uiTransform'
import { parseUiBackground } from './uiBackground'
import { parseUiDropdown } from './uiDropdown'

export * from './types'
export { CANVAS_ROOT_ENTITY }
export * from './uiTransform/types'
export * from './listeners/types'
export * from './uiInput/types'
export * from './uiBackground/types'
export * from './uiDropdown/types'

/**
 * @public
 */
export function UiEntity(props: EntityPropTypes & Partial<CommonProps>) {
  const { uiTransform, uiBackground, uiDropdown, ...otherProps } = props
  const uiTransformProps = parseUiTransform(uiTransform)
  const uiBackgroundProps = uiBackground
    ? { uiBackground: parseUiBackground(uiBackground) }
    : undefined
  const uiDropdownProps = uiDropdown
    ? { uiDropdown: parseUiDropdown(uiDropdown) }
    : undefined

  return (
    <entity
      uiTransform={uiTransformProps}
      {...uiBackgroundProps}
      {...uiDropdownProps}
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
