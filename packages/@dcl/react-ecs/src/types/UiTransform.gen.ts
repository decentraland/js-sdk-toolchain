/* eslint-disable */
import type { Color3 } from './common/Color3.gen'

export const protobufPackage = ''

export enum YGPositionType {
  YGPositionTypeStatic = 0,
  YGPositionTypeRelative = 1,
  YGPositionTypeAbsolute = 2,
  UNRECOGNIZED = -1
}

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

export enum YGUnit {
  YGUnitUndefined = 0,
  YGUnitPoint = 1,
  YGUnitPercent = 2,
  YGUnitAuto = 3,
  UNRECOGNIZED = -1
}

export enum YGDirection {
  YGDirectionInherit = 0,
  YGDirectionLTR = 1,
  YGDirectionRTL = 2,
  UNRECOGNIZED = -1
}

export enum YGFlexDirection {
  YGFlexDirectionColumn = 0,
  YGFlexDirectionColumnReverse = 1,
  YGFlexDirectionRow = 2,
  YGFlexDirectionRowReverse = 3,
  UNRECOGNIZED = -1
}

export enum YGWrap {
  YGWrapNoWrap = 0,
  YGWrapWrap = 1,
  YGWrapWrapReverse = 2,
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

export enum YGDisplay {
  YGDisplayFlex = 0,
  YGDisplayNone = 1,
  UNRECOGNIZED = -1
}

export enum YGEdge {
  YGEdgeLeft = 0,
  YGEdgeTop = 1,
  YGEdgeRight = 2,
  YGEdgeBottom = 3,
  YGEdgeStart = 4,
  YGEdgeEnd = 5,
  YGEdgeHorizontal = 6,
  YGEdgeVertical = 7,
  YGEdgeAll = 8,
  UNRECOGNIZED = -1
}

export interface PBUiTransform {
  parent: number
  rightOf: number
  backgroundColor: Color3 | undefined
  positionType: YGPositionType
  alignContent: YGAlign
  alignItems: YGAlign
  alignSelf: YGAlign
  flexDirection: YGFlexDirection
  flexWrap: YGWrap
  justifyContent: YGJustify
  overflow: YGOverflow
  display: YGDisplay
  direction: YGDirection
  flex: number
  flexBasisUnit: YGUnit
  flexBasis: number
  flexGrow: number
  flexShrink: number
  widthUnit: YGUnit
  width: number
  heightUnit: YGUnit
  height: number
  minWidthUnit: YGUnit
  minWidth: number
  minHeightUnit: YGUnit
  minHeight: number
  maxWidthUnit: YGUnit
  maxWidth: number
  maxHeightUnit: YGUnit
  maxHeight: number
  positionLeftUnit: YGUnit
  positionLeft: number
  positionTopUnit: YGUnit
  positionTop: number
  positionRightUnit: YGUnit
  positionRight: number
  positionBottomUnit: YGUnit
  positionBottom: number
  /** margin */
  marginLeftUnit: YGUnit
  marginLeft: number
  marginTopUnit: YGUnit
  marginTop: number
  marginRightUnit: YGUnit
  marginRight: number
  marginBottomUnit: YGUnit
  marginBottom: number
  paddingLeftUnit: YGUnit
  paddingLeft: number
  paddingTopUnit: YGUnit
  paddingTop: number
  paddingRightUnit: YGUnit
  paddingRight: number
  paddingBottomUnit: YGUnit
  paddingBottom: number
  borderLeft: number
  borderTop: number
  borderRight: number
  borderBottom: number
}
