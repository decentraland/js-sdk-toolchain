import { PBUiInput } from '@dcl/ecs'

import { parseProps } from '../utils'
import { ReactEcs } from '../../react-ecs'
import { EntityPropTypes } from '../types'
import { UiInputProps } from './types'
import { getTextAlign, getFont } from '../Label/utils'

function parseUiInput(props: Partial<UiInputProps>): PBUiInput {
  const { textAlign, font, ...otherProps } = props
  return {
    disabled: false,
    placeholder: '',
    ...otherProps,
    ...getTextAlign(textAlign),
    ...getFont(font)
  }
}

/**
 * @public
 */
/*#__PURE__*/
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
