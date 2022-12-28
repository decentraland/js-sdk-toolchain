import { ReactEcs } from '../react-ecs'
import { CommonProps, EntityPropTypes } from './types'
import { CANVAS_ROOT_ENTITY } from './uiTransform'
import { parseProps } from './utils'

export * from './types'
export { CANVAS_ROOT_ENTITY }
export * from './uiTransform/types'
export * from './listeners/types'
export * from './uiInput/types'
export * from './uiBackground/types'
export * from './uiDropdown/types'
export * from './uiText/types'

export { Dropdown } from './uiDropdown'
export { Input } from './uiInput'
export { Text } from './uiText'

/**
 * @public
 */
export function UiEntity(
  props: EntityPropTypes & Partial<CommonProps>
): ReactEcs.JSX.Element {
  return <entity {...parseProps(props)} />
}
