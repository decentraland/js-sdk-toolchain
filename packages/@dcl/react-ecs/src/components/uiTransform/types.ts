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
export type Display = 'flex' | 'none'
/**
 * @public
 */
export type Justify =
  | 'flex-start'
  | 'center'
  | 'flex-end'
  | 'space-between'
  | 'space-around'
  | 'space-evenly'
/**
 * @public
 */
export type Align =
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
export type FlexDirection = 'row' | 'column' | 'column-reverse' | 'row-reverse'
/**
 * @public
 */
export type FlexWrap = 'wrap' | 'nowrap' | 'wrap-reverse'

/**
 * @public
 */
export type Overflow = 'hidden' | 'scroll' | 'visible'

/**
 * @public
 */
export type PositionType = 'absolute' | 'relative'

/**
 * @public
 */
export interface UiTransformProps {
  display?: Display
  flex?: number
  justifyContent?: Justify
  positionType?: PositionType
  alignItems?: Align
  alignSelf?: Align
  alignContent?: Align
  flexDirection?: FlexDirection
  position?: Partial<Position>
  padding?: Partial<Position>
  margin?: Partial<Position>
  width?: PositionUnit
  height?: PositionUnit
  minWidth?: PositionUnit
  maxWidth?: PositionUnit
  minHeight?: PositionUnit
  maxHeight?: PositionUnit
  flexWrap?: FlexWrap
  flexBasis?: number
  flexGrow?: number
  flexShrink?: number
  overflow?: Overflow
}
