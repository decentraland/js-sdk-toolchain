export enum YGAlign {
  YGAlignAuto = 0,
  YGAlignFlexStart = 1,
  YGAlignCenter = 2,
  YGAlignFlexEnd = 3,
  YGAlignStretch = 4,
  YGAlignBaseline = 5,
  YGAlignSpaceBetween = 6,
  YGAlignSpaceAround = 7,
  UNRECOGNIZED = -1
}

export enum YGDirection {
  YGDirectionInherit = 0,
  YGDirectionLTR = 1,
  YGDirectionRTL = 2,
  UNRECOGNIZED = -1
}

export enum YGDisplay {
  YGDisplayFlex = 0,
  YGDisplayNone = 1,
  UNRECOGNIZED = -1
}

export enum YGFlexDirection {
  YGFlexDirectionColumn = 0,
  YGFlexDirectionColumnReverse = 1,
  YGFlexDirectionRow = 2,
  YGFlexDirectionRowReverse = 3,
  UNRECOGNIZED = -1
}

export enum YGJustify {
  YGJustifyFlexStart = 0,
  YGJustifyCenter = 1,
  YGJustifyFlexEnd = 2,
  YGJustifySpaceBetween = 3,
  YGJustifySpaceAround = 4,
  YGJustifySpaceEvenly = 5,
  UNRECOGNIZED = -1
}

export enum YGOverflow {
  YGOverflowVisible = 0,
  YGOverflowHidden = 1,
  YGOverflowScroll = 2,
  UNRECOGNIZED = -1
}

export enum YGPositionType {
  YGPositionTypeStatic = 0,
  YGPositionTypeRelative = 1,
  YGPositionTypeAbsolute = 2,
  UNRECOGNIZED = -1
}

export enum YGUnit {
  YGUnitUndefined = 0,
  YGUnitPoint = 1,
  YGUnitPercent = 2,
  YGUnitAuto = 3,
  UNRECOGNIZED = -1
}

export enum YGWrap {
  YGWrapNoWrap = 0,
  YGWrapWrap = 1,
  YGWrapWrapReverse = 2,
  UNRECOGNIZED = -1
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

/**
 * @public
 */
export interface TextProps {
  value: string
  textColor: { r: number; g: number; b: number }
}

/**
 * @public
 */
export interface DivProps {
  display: YGDisplay
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
