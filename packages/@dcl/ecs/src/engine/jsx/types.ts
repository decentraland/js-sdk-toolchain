import { PBUiText } from '../../components/generated/pb/UiText.gen'
import {
  YGDisplay,
  YGJustify,
  YGPositionType,
  YGAlign,
  YGFlexDirection,
  YGDirection,
  YGWrap,
  YGOverflow
} from '../../components/generated/pb/UiTransform.gen'

/**
 * @public
 */
export type Position = {
  top: number | string
  right: number | string
  bottom: number | string
  left: number | string
}

/**
 * @public
 */
export interface TextProps {
  value: string
  textColor: { r: number; g: number; b: number }
}

/**
 * @public
 */
export interface DivProps {
  display: YGDisplay
  flex: number
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
  width: number
  height: number
  minWidth: number
  maxWidth: number
  minHeight: number
  maxHeight: number
  flexWrap: YGWrap
  flexBasis: number
  flexGrow: number
  flexShrink: number
  overflow: YGOverflow
  children: any //TODO :Remove
  // aspectRatio: number | undefined
}

type TextOpts = Partial<Omit<PBUiText, 'text'>>

declare global {
  namespace JSX {
    // The return type of our JSX Factory
    type Element = any

    // IntrinsicElementMap grabs all the standard HTML tags in the TS DOM lib.
    type IntrinsicElements = {
      divui: Partial<DivProps>
      textui: Partial<TextOpts>
    }
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface Component {}
  }
}
