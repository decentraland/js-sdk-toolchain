import { parsePosition, parseSize } from './utils'
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
export function parseUiTransform(props: UiTransformProps = {}): PBUiTransform {
  const {
    position,
    padding,
    margin,
    height,
    minHeight,
    maxHeight,
    width,
    maxWidth,
    minWidth,
    ...otherProps
  } = props
  return {
    ...defaultUiTransform,
    ...otherProps,
    ...parsePosition(position, 'position'),
    ...parsePosition(margin, 'margin'),
    ...parsePosition(padding, 'padding'),
    ...parseSize(height, 'height'),
    ...parseSize(minHeight, 'minHeight'),
    ...parseSize(maxHeight, 'maxHeight'),
    ...parseSize(width, 'width'),
    ...parseSize(minWidth, 'minWidth'),
    ...parseSize(maxWidth, 'maxWidth')
  }
}

export const defaultUiTransform: PBUiTransform = {
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
  positionType: YGPositionType.YGPT_RELATIVE,
  direction: YGDirection.YGD_INHERIT,
  flexWrap: YGWrap.YGW_WRAP,
  flexGrow: 0,
  flexShrink: 1,
  flex: 1,
  marginBottom: 0,
  marginBottomUnit: YGUnit.YGU_UNDEFINED,
  marginLeft: 0,
  marginLeftUnit: YGUnit.YGU_UNDEFINED,
  marginRight: 0,
  marginRightUnit: YGUnit.YGU_UNDEFINED,
  marginTop: 0,
  marginTopUnit: YGUnit.YGU_UNDEFINED,
  maxHeightUnit: YGUnit.YGU_UNDEFINED,
  maxWidthUnit: YGUnit.YGU_UNDEFINED,
  minHeightUnit: YGUnit.YGU_UNDEFINED,
  minWidthUnit: YGUnit.YGU_UNDEFINED,
  overflow: YGOverflow.YGO_VISIBLE,
  paddingBottom: 0,
  paddingBottomUnit: YGUnit.YGU_PERCENT,
  paddingLeft: 0,
  paddingLeftUnit: YGUnit.YGU_UNDEFINED,
  paddingTopUnit: YGUnit.YGU_UNDEFINED,
  paddingRight: 0,
  paddingRightUnit: YGUnit.YGU_UNDEFINED,
  paddingTop: 0,
  positionBottom: 0,
  positionBottomUnit: YGUnit.YGU_UNDEFINED,
  positionLeft: 0,
  positionLeftUnit: YGUnit.YGU_UNDEFINED,
  positionRight: 0,
  positionRightUnit: YGUnit.YGU_UNDEFINED,
  positionTop: 0,
  positionTopUnit: YGUnit.YGU_UNDEFINED,
  flexBasisUnit: YGUnit.YGU_UNDEFINED,
  widthUnit: YGUnit.YGU_UNDEFINED,
  heightUnit: YGUnit.YGU_UNDEFINED,
  borderBottom: 0,
  borderLeft: 0,
  borderRight: 0,
  borderTop: 0
}
