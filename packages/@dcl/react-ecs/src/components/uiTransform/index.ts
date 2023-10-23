import {
  getAlign,
  getDisplay,
  getFlexDirection,
  getFlexWrap,
  getJustify,
  getOverflow,
  getPointerFilter,
  getPositionType,
  parsePosition,
  parseSize
} from './utils'
import { UiTransformProps } from './types'
import {
  PointerFilterMode,
  YGAlign,
  YGDisplay,
  YGFlexDirection,
  YGJustify,
  YGOverflow,
  YGPositionType,
  YGUnit
} from '@dcl/ecs'
import { PBUiTransform } from '@dcl/ecs/dist/components'

/**
 * @internal
 */
export const CANVAS_ROOT_ENTITY = 0

const defaultUiTransform: PBUiTransform = {
  overflow: YGOverflow.YGO_VISIBLE,
  display: YGDisplay.YGD_FLEX,
  justifyContent: YGJustify.YGJ_FLEX_START,
  alignSelf: YGAlign.YGA_AUTO,
  flexDirection: YGFlexDirection.YGFD_ROW,
  positionType: YGPositionType.YGPT_RELATIVE,
  parent: CANVAS_ROOT_ENTITY,
  rightOf: 0,
  flexBasis: 0,
  width: 0,
  height: 0,
  minWidth: 0,
  minHeight: 0,
  maxWidth: 0,
  maxHeight: 0,
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
  paddingBottom: 0,
  paddingBottomUnit: YGUnit.YGU_UNDEFINED,
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
  pointerFilter: PointerFilterMode.PFM_NONE
}

/**
 * @public
 */
/* @__PURE__ */
export function parseUiTransform(props: UiTransformProps = {}): PBUiTransform {
  const { height, minHeight, maxHeight, width, minWidth, maxWidth, alignItems, alignContent, flexWrap, ...otherProps } =
    props
  return {
    ...defaultUiTransform,
    ...otherProps,
    ...parsePosition(props.position, 'position'),
    ...parsePosition(props.margin, 'margin'),
    ...parsePosition(props.padding, 'padding'),
    ...parseSize(props.height, 'height'),
    ...parseSize(props.minHeight, 'minHeight'),
    ...parseSize(props.maxHeight, 'maxHeight'),
    ...parseSize(props.width, 'width'),
    ...parseSize(props.minWidth, 'minWidth'),
    ...parseSize(props.maxWidth, 'maxWidth'),
    ...getDisplay(props.display),
    ...getAlign('alignSelf', props.alignSelf ?? 'auto'),
    ...getJustify(props.justifyContent),
    ...getFlexDirection(props.flexDirection),
    ...getOverflow(props.overflow),
    ...getPointerFilter(props.pointerFilter),
    ...getPositionType(props.positionType),
    // Optional values
    ...(alignContent && getAlign('alignContent', alignContent)),
    ...(alignItems && getAlign('alignItems', alignItems)),
    ...(flexWrap && getFlexWrap(flexWrap))
  }
}
