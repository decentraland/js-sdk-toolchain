import { Color3 } from '../../generated/common/Color3.gen'
import {
  YGAlign,
  YGDirection,
  YGDisplay,
  YGFlexDirection,
  YGJustify,
  YGOverflow,
  YGPositionType,
  YGWrap
} from '../../generated/UiTransform.gen'

export {
  YGAlign,
  YGDirection,
  YGDisplay,
  YGFlexDirection,
  YGJustify,
  YGOverflow,
  YGPositionType,
  YGWrap,
  PBUiTransform,
  YGUnit
} from '../../generated/UiTransform.gen'
export { Color3 } from '../../generated/common/Color3.gen'

/**
 * @public
 */
export type Position = {
  top: number | string
  right: number | string
  bottom: number | string
  left: number | string
}

/**
 * @public
 */
export interface DivProps {
  display: YGDisplay
  backgroundColor: Color3
  flex: number
  justifyContent: YGJustify
  positionType: YGPositionType
  alignItems: YGAlign
  alignSelf: YGAlign
  alignContent: YGAlign
  flexDirection: YGFlexDirection
  position: Position
  padding: Position
  margin: Position
  border: Position
  direction: YGDirection
  width: number
  height: number
  minWidth: number
  maxWidth: number
  minHeight: number
  maxHeight: number
  flexWrap: YGWrap
  flexBasis: number
  flexGrow: number
  flexShrink: number
  overflow: YGOverflow
  children: any //TODO :Remove
  // aspectRatio: number | undefined
}
