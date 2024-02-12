import { PBUiText } from '@dcl/ecs'
import { ReactEcs } from '../react-ecs'
import { UiLabelProps } from './Label/types'
import { getFont, getFontSize, getTextAlign } from './Label/utils'
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
export { Label, scaleFontSize } from './Label'
export { Button } from './Button'

/**
 * @public
 * @category Component
 */
/* @__PURE__ */
export function UiEntity(props: EntityPropTypes & { uiText?: UiLabelProps }) {
  const uiText: { uiText: PBUiText } | undefined = props.uiText && {
    uiText: {
      ...props.uiText,
      ...getFont(props.uiText.font),
      ...getTextAlign(props.uiText.textAlign),
      ...getFontSize(props.uiText.fontSize)
    } as PBUiText
  }

  return <entity {...parseProps(props)} {...uiText} />
}
