import {
  YGAlign,
  YGDisplay,
  YGFlexDirection,
  YGJustify,
  YGOverflow,
  YGPositionType,
  YGWrap
} from '@dcl/ecs/dist/components/generated/index.gen'

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
