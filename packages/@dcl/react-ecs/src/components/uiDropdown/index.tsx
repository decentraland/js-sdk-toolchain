import { PBUiDropdown } from '@dcl/ecs'
import { Listeners, parseProps } from '..'
import { ReactEcs } from '../../react-ecs'
import { EntityPropTypes } from '../types'
import { UiDropdownProps } from './types'

function parseUiDropdown(props: UiDropdownProps): PBUiDropdown {
  return {
    acceptEmpty: false,
    options: [],
    selectedIndex: props.acceptEmpty ? -1 : 0,
    disabled: false,
    ...props
  }
}

/**
 * @public
 */
export function Dropdown(
  props: Pick<EntityPropTypes, 'uiTransform'> & UiDropdownProps & Listeners
) {
  const { uiTransform, onMouseDown, onMouseUp, ...otherProps } = props
  const dropdownProps = parseUiDropdown(otherProps)
  const commonProps = parseProps({ uiTransform, onMouseDown, onMouseUp })
  return <entity {...commonProps} uiDropdown={dropdownProps} />
}
