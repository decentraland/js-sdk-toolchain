import { parseProps } from '..'
import { ReactEcs } from '../../react-ecs'
import { CommonProps, EntityPropTypes } from '../types'
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
    Partial<CommonProps> &
    Partial<UiInputProps>
) {
  const { uiTransform, key, children, ...otherProps } = props
  const inputProps = parseUiInput(otherProps)
  const commonProps = parseProps({ uiTransform, key, children })
  return <entity {...commonProps} uiInput={inputProps} />
}
