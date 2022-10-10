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
} from '../../generated/ecs/components/UiTransform.gen'

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
  YGWrap
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
