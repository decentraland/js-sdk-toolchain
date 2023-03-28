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
 * Input component
 *
 * An Input is a field used to obtain a response from a user.
 *
 * @example
    <Input
      placeholder="Please enter your email"
      onChange={(value) => {
        email = value
      }}
      uiBackground={{ color: Color4.Red() }}
      uiTransform={{ width: 200, height: 36 }}
      value={textValue}
    />
 *
 * @category Component
 */ /* @__PURE__ */
export function Input(props: EntityPropTypes & Partial<UiInputProps>) {
  const { uiTransform, uiBackground, onMouseDown, onMouseUp, ...otherProps } = props
  const inputProps = parseUiInput(otherProps)
  const commonProps = parseProps({
    uiTransform,
    uiBackground,
    onMouseDown,
    onMouseUp
  })
  return <entity {...commonProps} uiInput={inputProps} />
}
