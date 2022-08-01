import {
  YGDisplay,
  YGJustify,
  YGPositionType,
  YGAlign,
  YGFlexDirection,
  YGDirection,
  YGWrap
} from '../../src/components/generated/pb/UiTransform.gen'

export type Position = {
  top: number | string
  right: number | string
  bottom: number | string
  left: number | string
}

export interface DivProps {
  display: YGDisplay
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
  width: number | string
  height: number | string
  minWidth: number
  maxWidth: number
  minHeight: number
  maxHeight: number
  flexWrap: YGWrap
  flexBasis: string | number
  flexGrow: number
  flexShrink: number
  aspectRatio: number | undefined
}
