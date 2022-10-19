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
} from '../../generated/decentraland/sdk/components/ui_transform.gen'

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

export type PositionUnit = `${number}px` | `${number}%` | number
/**
 * @public
 */
export type Position = {
  top: PositionUnit
  right: PositionUnit
  bottom: PositionUnit
  left: PositionUnit
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
  position?: Partial<Position>
  padding?: Partial<Position>
  margin?: Partial<Position>
  direction?: YGDirection
  width?: PositionUnit
  height?: PositionUnit
  minWidth?: PositionUnit
  maxWidth?: PositionUnit
  minHeight?: PositionUnit
  maxHeight?: PositionUnit
  flexWrap?: YGWrap
  flexBasis?: number
  flexGrow?: number
  flexShrink?: number
  overflow?: YGOverflow
}
