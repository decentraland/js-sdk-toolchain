import { ScaleUnit } from '../types'

/**
 * unit value specified. i.e. 1 || '100%' || '1px' || '10vw'
 * @public
 */
export type PositionUnit = `${number}px` | `${number}%` | number | `${number}` | ScaleUnit

/**
 * The values are in clockwise order, beginning at the top: top, right, bottom, then left

 * When one value is specified, it applies the same margin to all four sides.
 *
 * When two values are specified, the first margin applies to the top and bottom, the second to the left and right.
 *
 * When three values are specified, the first margin applies to the top, the second to the left and right, the third to the bottom.
 *
When four values are specified, the margins apply to the top, right, bottom, and left in that order (clockwise).
 * @public
 */
export type PositionShorthand =
  | PositionUnit
  | `${PositionUnit} ${PositionUnit}`
  | `${PositionUnit} ${PositionUnit} ${PositionUnit}`
  | `${PositionUnit} ${PositionUnit} ${PositionUnit} ${PositionUnit}`

/**
 * Type used for defining the position of the element. i.e. margin, padding
 * @public
 */
export interface Position {
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
 * The overflow property controls what happens to content that is too big to fit into an area
 */
export type OverflowType = 'hidden' | 'scroll' | 'visible'

/**
 * @public
 * The position property specifies the type of positioning method used for an element
 */
export type PositionType = 'absolute' | 'relative'

/**
 * @public
 * The pointer filter property determines if the ui element blocks the pointer or not (elements with pointer events always block the pointer regardless of this property)
 */
export type PointerFilterType = 'none' | 'block'

/**
 * Layout props to position things in the canvas
 * @public
 */
export interface UiTransformProps {
  /** The display property controls if a item is going to be displayed or not. */
  display?: DisplayType
  /** The flex shorthand property sets how a flex item will grow or shrink to fit the space available in its flex container. */
  flex?: number
  /** Justify content describes how to align children within the main axis of their container. */
  justifyContent?: JustifyType
  /** The position type of an element defines how it is positioned within its parent. */
  positionType?: PositionType
  /** The align-items property controls the alignment of items on the Cross Axis. */
  alignItems?: AlignType
  /** The align-self property has the same options and effect as align items but instead of affecting the children within a container, you can apply this property to a single child to change its alignment within its parent */
  alignSelf?: AlignType
  /** The align-content property sets the distribution of space between and around content items along a flexbox's cross-axis or a grid's block axis. */
  alignContent?: AlignType
  /** The flex-direction property sets how flex items are placed in the flex container defining the main axis and the direction (normal or reversed). */
  flexDirection?: FlexDirectionType
  /** The position property sets how an element is positioned in a document. The top, right, bottom, and left properties determine the final location of positioned elements. */
  position?: Partial<Position> | PositionShorthand
  /** The padding shorthand property sets the padding area on all four sides of an element at once. */
  padding?: Partial<Position> | PositionShorthand
  /** The margin shorthand property sets the margin area on all four sides of an element. */
  margin?: Partial<Position> | PositionShorthand
  /** The width property specifies the width of an element. Using 'auto' as value makes it adapt to its content. */
  width?: PositionUnit | 'auto'
  /** The height property specifies the height of an element. Using 'auto' as value makes it adapt to its content. */
  height?: PositionUnit | 'auto'
  /** The min-width property sets the minimum width of an element. */
  minWidth?: PositionUnit
  /** The max-width property sets the maximum width of an element. */
  maxWidth?: PositionUnit
  /** The min-height CSS property sets the minimum height of an element. */
  minHeight?: PositionUnit
  /** The max-height property sets the maximum height of an element */
  maxHeight?: PositionUnit
  /** The flex-wrap property sets whether flex items are forced onto one line or can wrap onto multiple lines. If wrapping is allowed, it sets the direction that lines are stacked*/
  flexWrap?: FlexWrapType
  /** The flex-basis property sets the initial main size of a flex item. It sets the size of the content box.*/
  flexBasis?: number
  /** The flex-grow property sets the flex grow factor of a flex item's main size. */
  flexGrow?: number
  /** The flex-shrink property sets the flex shrink factor of a flex item. If the size of all flex items is larger than the flex container, items shrink to fit according to flex-shrink. */
  flexShrink?: number
  /** The overflow property controls what happens to content that is too big to fit into an area */
  overflow?: OverflowType
  /** The pointer filter property determines if the ui element blocks the pointer or not (elements with pointer events always block the pointer regardless of this property) **/
  pointerFilter?: PointerFilterType
}
