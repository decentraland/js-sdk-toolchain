import { ReactEcs } from '../react-ecs'
import { CommonProps, EntityPropTypes } from './types'
import { parseUiTransform, CANVAS_ROOT_ENTITY } from './uiTransform'
import { parseUiBackground } from './uiBackground'
import { UiDropdownComponent } from './uiDropdown/types'
import { UiInputComponent } from './uiInput/types'

export * from './types'
export { CANVAS_ROOT_ENTITY }
export * from './uiTransform/types'
export * from './listeners/types'
export * from './uiInput/types'
export * from './uiBackground/types'
export * from './uiDropdown/types'

export { Dropdown } from './uiDropdown'
export { Input } from './uiInput'

/**
 * @public
 */
export function UiEntity(props: EntityPropTypes & Partial<CommonProps>) {
  return <entity {...parseProps(props)} />
}

/**
 * @internal
 */
export function parseProps(
  props: EntityPropTypes &
    Partial<CommonProps> &
    UiDropdownComponent &
    UiInputComponent
) {
  const { uiTransform, uiBackground, ...otherProps } = props
  const uiTransformProps = parseUiTransform(uiTransform)
  const uiBackgroundProps = uiBackground
    ? { uiBackground: parseUiBackground(uiBackground) }
    : undefined
  return {
    ...otherProps,
    uiTransform: uiTransformProps,
    ...uiBackgroundProps
  }
}
