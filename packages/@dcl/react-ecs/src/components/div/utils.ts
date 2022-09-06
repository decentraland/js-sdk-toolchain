import {
  YGAlign,
  YGDirection,
  YGDisplay,
  YGFlexDirection,
  YGJustify,
  YGOverflow,
  YGPositionType,
  YGUnit,
  YGWrap
} from './types'

type Position = {
  top: number
  right: number
  bottom: number
  left: number
}

export const defaultPosition = (pos?: Position) => ({
  top: pos?.top ?? 0,
  right: pos?.right ?? 0,
  bottom: pos?.bottom ?? 0,
  left: pos?.left ?? 0
})

const CANVAS_ROOT_ENTITY = 7

export const defaultDiv = {
  parent: CANVAS_ROOT_ENTITY,
  backgroundColor: { r: 0, g: 0, b: 0 },
  rightOf: 0,
  display: YGDisplay.YGDisplayFlex,
  flexBasis: NaN,
  width: NaN,
  height: NaN,
  minWidth: NaN,
  minHeight: NaN,
  maxWidth: NaN,
  maxHeight: NaN,
  justifyContent: YGJustify.YGJustifyFlexStart,
  alignItems: YGAlign.YGAlignStretch,
  alignSelf: YGAlign.YGAlignAuto,
  alignContent: YGAlign.YGAlignStretch,
  flexDirection: YGFlexDirection.YGFlexDirectionRow,
  positionType: YGPositionType.YGPositionTypeRelative,
  direction: YGDirection.YGDirectionInherit,
  flexWrap: YGWrap.YGWrapWrap,
  flexGrow: 0,
  flexShrink: 1,
  flex: 1,
  marginBottom: 0,
  marginBottomUnit: YGUnit.YGUnitPoint,
  marginLeft: 0,
  marginLeftUnit: YGUnit.YGUnitPoint,
  marginRight: 0,
  marginRightUnit: YGUnit.YGUnitPoint,
  marginTop: 0,
  marginTopUnit: YGUnit.YGUnitPoint,
  maxHeightUnit: YGUnit.YGUnitPoint,
  maxWidthUnit: YGUnit.YGUnitPoint,
  minHeightUnit: YGUnit.YGUnitPoint,
  minWidthUnit: YGUnit.YGUnitPoint,
  overflow: YGOverflow.YGOverflowVisible,
  paddingBottom: 0,
  paddingBottomUnit: YGUnit.YGUnitPercent,
  paddingLeft: 0,
  paddingLeftUnit: YGUnit.YGUnitUndefined,
  paddingTopUnit: YGUnit.YGUnitPoint,
  paddingRight: 0,
  paddingRightUnit: YGUnit.YGUnitPoint,
  paddingTop: 0,
  positionBottom: 0,
  positionBottomUnit: YGUnit.YGUnitPoint,
  positionLeft: 0,
  positionLeftUnit: YGUnit.YGUnitPoint,
  positionRight: 0,
  positionRightUnit: YGUnit.YGUnitPoint,
  positionTop: 0,
  positionTopUnit: YGUnit.YGUnitPoint,
  flexBasisUnit: YGUnit.YGUnitPoint,
  widthUnit: YGUnit.YGUnitPoint,
  heightUnit: YGUnit.YGUnitPoint,
  borderBottom: 0,
  borderLeft: 0,
  borderRight: 0,
  borderTop: 0
}
