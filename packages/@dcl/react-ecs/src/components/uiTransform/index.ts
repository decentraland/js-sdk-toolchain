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

export const CANVAS_ROOT_ENTITY = 0

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
  display: YGDisplay.YGD_FLEX,
  flexBasis: NaN,
  width: 0,
  height: 0,
  minWidth: 0,
  minHeight: 0,
  maxWidth: NaN,
  maxHeight: NaN,
  justifyContent: YGJustify.YGJ_FLEX_START,
  alignItems: YGAlign.YGA_STRETCH,
  alignSelf: YGAlign.YGA_AUTO,
  alignContent: YGAlign.YGA_STRETCH,
  flexDirection: YGFlexDirection.YGFD_ROW,
  positionType: YGPositionType.YGP_RELATIVE,
  direction: YGDirection.YGD_INHERIT,
  flexWrap: YGWrap.YGW_WRAP,
  flexGrow: 0,
  flexShrink: 1,
  flex: 1,
  marginBottom: 0,
  marginBottomUnit: YGUnit.YGU_POINT,
  marginLeft: 0,
  marginLeftUnit: YGUnit.YGU_POINT,
  marginRight: 0,
  marginRightUnit: YGUnit.YGU_POINT,
  marginTop: 0,
  marginTopUnit: YGUnit.YGU_POINT,
  maxHeightUnit: YGUnit.YGU_POINT,
  maxWidthUnit: YGUnit.YGU_POINT,
  minHeightUnit: YGUnit.YGU_POINT,
  minWidthUnit: YGUnit.YGU_POINT,
  overflow: YGOverflow.YGO_VISIBLE,
  paddingBottom: 0,
  paddingBottomUnit: YGUnit.YGU_PERCENT,
  paddingLeft: 0,
  paddingLeftUnit: YGUnit.YGU_UNDEFINED,
  paddingTopUnit: YGUnit.YGU_POINT,
  paddingRight: 0,
  paddingRightUnit: YGUnit.YGU_POINT,
  paddingTop: 0,
  positionBottom: 0,
  positionBottomUnit: YGUnit.YGU_POINT,
  positionLeft: 0,
  positionLeftUnit: YGUnit.YGU_POINT,
  positionRight: 0,
  positionRightUnit: YGUnit.YGU_POINT,
  positionTop: 0,
  positionTopUnit: YGUnit.YGU_POINT,
  flexBasisUnit: YGUnit.YGU_POINT,
  widthUnit: YGUnit.YGU_POINT,
  heightUnit: YGUnit.YGU_POINT,
  borderBottom: 0,
  borderLeft: 0,
  borderRight: 0,
  borderTop: 0
}
