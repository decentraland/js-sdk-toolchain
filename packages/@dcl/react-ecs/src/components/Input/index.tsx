import { PBUiInput } from '@dcl/ecs'

import { parseProps } from '../utils'
import { ReactEcs } from '../../react-ecs'
import { EntityPropTypes } from '../types'
import { UiInputProps } from './types'

function parseUiInput(props: Partial<UiInputProps>): PBUiInput {
  return {
    disabled: false,
    placeholder: '',
    ...props
  }
}

/**
 * @public
 */
export function Input(props: EntityPropTypes & Partial<UiInputProps>) {
  const { uiTransform, uiBackground, onMouseDown, onMouseUp, ...otherProps } =
    props
  const inputProps = parseUiInput(otherProps)
  const commonProps = parseProps({
    uiTransform,
    uiBackground,
    onMouseDown,
    onMouseUp
  })
  return <entity {...commonProps} uiInput={inputProps} />
}
