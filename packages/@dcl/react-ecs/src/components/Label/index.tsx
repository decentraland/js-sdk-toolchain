import { PBUiText } from '@dcl/ecs'

import { parseProps } from '../utils'
import { ReactEcs } from '../../react-ecs'
import { EntityPropTypes } from '../types'
import { UiLabelProps } from './types'
import { getFont, getTextAlign } from './utils'

/**
 * @public
 */
/*#__PURE__*/
export function Label(props: EntityPropTypes & UiLabelProps) {
  const { uiTransform, uiBackground, onMouseDown, onMouseUp, ...uiTextProps } =
    props
  const commonProps = parseProps({
    uiTransform,
    uiBackground,
    onMouseDown,
    onMouseUp
  })
  const uiText: PBUiText = {
    ...uiTextProps,
    ...getFont(uiTextProps.font),
    ...getTextAlign(uiTextProps.textAlign)
  }

  return <entity {...commonProps} uiText={uiText} />
}
