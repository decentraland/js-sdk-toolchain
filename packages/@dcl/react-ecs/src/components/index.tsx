import { ReactEcs } from '../react-ecs'
import { EntityPropTypes } from './types'
import { parseProps } from './utils'

export * from './types'
export * from './uiTransform/types'
export * from './listeners/types'
export * from './Input/types'
export * from './uiBackground/types'
export * from './Dropdown/types'
export * from './Label/types'
export * from './Button/types'

export { Dropdown } from './Dropdown'
export { Input } from './Input'
export { Label } from './Label'
export { Button } from './Button'

/**
 * @public
 */
/*#__PURE__*/
export function UiEntity(props: EntityPropTypes) {
  return <entity {...parseProps(props)} />
}
