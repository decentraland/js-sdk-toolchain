import {
  getAlign,
  getFlexDirection,
  getDisplay,
  getFlexWrap,
  getJustify,
  getOverflow,
  getPoistionType,
  parsePosition,
  parseSize
} from './utils'
import { UiTransformProps } from './types'
import { YGAlign, YGUnit } from '@dcl/ecs'
import { PBUiTransform } from '@dcl/ecs/dist/components'

export const CANVAS_ROOT_ENTITY = 0

const defaultUiTransform: Omit<
  PBUiTransform,
  | 'display'
  | 'justifyContent'
  | 'alignSelf'
  | 'overflow'
  | 'flexDirection'
  | 'positionType'
> = {
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
  heightUnit: YGUnit.YGU_UNDEFINED
}

/**
 * @public
 */
/*#__PURE__*/
export function parseUiTransform(props: UiTransformProps = {}): PBUiTransform {
  const {
    height,
    minHeight,
    maxHeight,
    width,
    minWidth,
    maxWidth,
    ...otherProps
  } = props
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
    ...getAlign('alignContent', props.alignContent, YGAlign.YGA_FLEX_START),
    ...getAlign('alignSelf', props.alignSelf, YGAlign.YGA_FLEX_START),
    ...getAlign('alignItems', props.alignItems, YGAlign.YGA_FLEX_START),
    ...getJustify(props.justifyContent),
    ...getFlexDirection(props.flexDirection),
    ...getFlexWrap(props.flexWrap),
    ...getOverflow(props.overflow),
    ...getPoistionType(props.positionType)
  }
}
