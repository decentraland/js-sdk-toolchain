import {
  YGAlign,
  YGDirection,
  YGDisplay,
  YGFlexDirection,
  YGJustify,
  YGOverflow,
  YGPositionType,
  YGWrap
} from '../../src/components/generated/pb/UiTransform.gen'
import { DivProps, Position } from './types'

export const defaultPosition = (pos?: Position) => ({
  top: pos?.top ?? 0,
  right: pos?.right ?? 0,
  bottom: pos?.bottom ?? 0,
  left: pos?.left ?? 0
})

export const defaultDiv: DivProps = {
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
  position: defaultPosition({
    left: NaN,
    top: NaN,
    right: NaN,
    bottom: NaN
  }),
  padding: defaultPosition(),
  margin: defaultPosition(),
  border: defaultPosition(),
  overflow: YGOverflow.YGOverflowVisible
}
