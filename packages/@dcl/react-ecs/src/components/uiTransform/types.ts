import { Color3 } from '../../generated/common/Color3.gen'
import {
  PBUiTransform,
  YGAlign,
  YGDirection,
  YGDisplay,
  YGFlexDirection,
  YGJustify,
  YGOverflow,
  YGPositionType,
  YGUnit,
  YGWrap
} from '../../generated/UiTransform.gen'

export {
  PBUiTransform,
  YGAlign,
  YGDirection,
  YGDisplay,
  YGFlexDirection,
  YGJustify,
  YGOverflow,
  YGPositionType,
  YGUnit,
  YGWrap,
  Color3
}

/**
 * @public
 */
export type Position = {
  top: number | string
  right: number | string
  bottom: number | string
  left: number | string
}

export const CANVAS_ROOT_ENTITY = 7

/**
 * @public
 */
export interface UiTransformProps {
  display?: YGDisplay
  backgroundColor?: Color3
  flex?: number
  justifyContent?: YGJustify
  positionType?: YGPositionType
  alignItems?: YGAlign
  alignSelf?: YGAlign
  alignContent?: YGAlign
  flexDirection?: YGFlexDirection
  position?: Position
  padding?: Position
  margin?: Position
  border?: Position
  direction?: YGDirection
  width?: number
  height?: number
  minWidth?: number
  maxWidth?: number
  minHeight?: number
  maxHeight?: number
  flexWrap?: YGWrap
  flexBasis?: number
  flexGrow?: number
  flexShrink?: number
  overflow?: YGOverflow
}
