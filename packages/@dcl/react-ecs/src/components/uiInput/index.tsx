import { Listeners, parseProps } from '..'
import { ReactEcs } from '../../react-ecs'
import { EntityPropTypes } from '../types'
import { UiInputProps } from './types'

function parseUiInput(props: Partial<UiInputProps>): UiInputProps {
  return {
    disabled: false,
    placeholder: '',
    ...props
  }
}

/**
 * @public
 */
export function Input(
  props: Pick<EntityPropTypes, 'uiTransform'> &
    Partial<UiInputProps> &
    Listeners
) {
  const { uiTransform, onMouseDown, onMouseUp, ...otherProps } = props
  const inputProps = parseUiInput(otherProps)
  const commonProps = parseProps({ uiTransform, onMouseDown, onMouseUp })
  return <entity {...commonProps} uiInput={inputProps} />
}
