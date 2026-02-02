import { PBUiInput } from '@dcl/ecs'

import { parseProps } from '../utils'
import { ReactEcs } from '../../react-ecs'
import { EntityPropTypes } from '../types'
import { UiInputProps } from './types'
import { getTextAlign, getFont, getFontSize } from '../Label/utils'

// Default colors for Input
const DEFAULT_BORDER_COLOR = { r: 0.5, g: 0.5, b: 0.5, a: 1 } // Gray
const DEFAULT_BACKGROUND_COLOR = { r: 1, g: 1, b: 1, a: 1 } // White

function parseUiInput(props: Partial<UiInputProps>): PBUiInput {
  const { textAlign, font, fontSize, ...otherProps } = props
  return {
    disabled: false,
    placeholder: '',
    ...otherProps,
    ...getTextAlign(textAlign),
    ...getFont(font),
    ...getFontSize(fontSize)
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
      onSubmit={(value) => {
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
  const { uiTransform, uiBackground, onMouseDown, onMouseUp, onMouseEnter, onMouseLeave, ...otherProps } = props
  const inputProps = parseUiInput(otherProps)

  // Apply default uiTransform values for border properties
  const uiTransformWithDefaults = {
    borderRadius: 25,
    borderWidth: 1,
    borderColor: DEFAULT_BORDER_COLOR,
    ...uiTransform
  }

  // Apply default uiBackground if not provided
  const uiBackgroundWithDefaults = uiBackground ?? { color: DEFAULT_BACKGROUND_COLOR }

  const commonProps = parseProps({
    uiTransform: uiTransformWithDefaults,
    uiBackground: uiBackgroundWithDefaults,
    onMouseDown,
    onMouseUp,
    onMouseEnter,
    onMouseLeave
  })
  return <entity {...commonProps} uiInput={inputProps} />
}
