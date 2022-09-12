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
  YGWrap,
  UiTransformProps
} from './types'

export const CANVAS_ROOT_ENTITY = 7

/**
 * @public
 */
export function parseUiTransform(
  props: UiTransformProps | undefined
): PBUiTransform {
  return {
    ...defaultDiv,
    ...(props || {})
  }
}

export const defaultDiv: PBUiTransform = {
  parent: CANVAS_ROOT_ENTITY,
  rightOf: 0,
  display: YGDisplay.YGDisplayFlex,
  flexBasis: 0,
  width: 0,
  height: 0,
  minWidth: 0,
  minHeight: 0,
  maxWidth: 0,
  maxHeight: 0,
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
