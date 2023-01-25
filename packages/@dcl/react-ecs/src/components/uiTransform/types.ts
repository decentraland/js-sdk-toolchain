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
export type DisplayType = 'flex' | 'none'
/**
 * @public
 */
export type JustifyType = 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly'
/**
 * @public
 */
export type AlignType =
  | 'auto'
  | 'flex-start'
  | 'center'
  | 'flex-end'
  | 'stretch'
  | 'baseline'
  | 'space-between'
  | 'space-around'

/**
 * @public
 */
export type FlexDirectionType = 'row' | 'column' | 'column-reverse' | 'row-reverse'
/**
 * @public
 */
export type FlexWrapType = 'wrap' | 'nowrap' | 'wrap-reverse'

/**
 * @public
 */
export type OverflowType = 'hidden' | 'scroll' | 'visible'

/**
 * @public
 */
export type PositionType = 'absolute' | 'relative'

/**
 * @public
 */
export interface UiTransformProps {
  display?: DisplayType
  flex?: number
  justifyContent?: JustifyType
  positionType?: PositionType
  alignItems?: AlignType
  alignSelf?: AlignType
  alignContent?: AlignType
  flexDirection?: FlexDirectionType
  position?: Partial<Position>
  padding?: Partial<Position>
  margin?: Partial<Position>
  width?: PositionUnit
  height?: PositionUnit
  minWidth?: PositionUnit
  maxWidth?: PositionUnit
  minHeight?: PositionUnit
  maxHeight?: PositionUnit
  flexWrap?: FlexWrapType
  flexBasis?: number
  flexGrow?: number
  flexShrink?: number
  overflow?: OverflowType
}
