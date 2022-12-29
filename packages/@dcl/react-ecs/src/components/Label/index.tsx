import { parseProps } from '../utils'
import { ReactEcs } from '../../react-ecs'
import { EntityPropTypes } from '../types'
import { UiTextProps } from './types'

/**
 * @public
 */
/*#__PURE__*/
export function Label(props: EntityPropTypes & UiTextProps) {
  const { uiTransform, uiBackground, onMouseDown, onMouseUp, ...uiTextProps } =
    props
  const commonProps = parseProps({
    uiTransform,
    uiBackground,
    onMouseDown,
    onMouseUp
  })

  return <entity {...commonProps} uiText={uiTextProps} />
}
