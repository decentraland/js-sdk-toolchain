import { parsePosition, parseSize } from './utils'
import {
  PBUiTransform,
  UiTransformProps,
  YGAlign,
  YGDisplay,
  YGFlexDirection,
  YGJustify,
  YGOverflow,
  YGPositionType,
  YGUnit
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

const defaultUiTransform: PBUiTransform = {
  parent: CANVAS_ROOT_ENTITY,
  rightOf: 0,
  display: YGDisplay.YGD_FLEX,
  flexBasis: 0,
  width: 0,
  height: 0,
  minWidth: 0,
  minHeight: 0,
  maxWidth: 0,
  maxHeight: 0,
  justifyContent: YGJustify.YGJ_FLEX_START,
  alignSelf: YGAlign.YGA_AUTO,
  flexDirection: YGFlexDirection.YGFD_ROW,
  positionType: YGPositionType.YGPT_RELATIVE,
  flexGrow: 0,
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
  heightUnit: YGUnit.YGU_UNDEFINED
}
