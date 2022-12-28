import { ReactEcs } from '../react-ecs'
import { CommonProps, EntityPropTypes } from './types'
import { CANVAS_ROOT_ENTITY } from './uiTransform'
import { parseProps } from './utils'

export * from './types'
export { CANVAS_ROOT_ENTITY }
export * from './uiTransform/types'
export * from './listeners/types'
export * from './Input/types'
export * from './uiBackground/types'
export * from './Dropdown/types'
export * from './Text/types'
export * from './Button/types'

export { Dropdown } from './Dropdown'
export { Input } from './Input'
export { Text } from './Text'
export { Button } from './Button'

/**
 * @public
 */
export function UiEntity(props: EntityPropTypes & Partial<CommonProps>) {
  return <entity {...parseProps(props)} />
}
