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
  // aspectRatio: number | undefined
}

/**
 * @public
 */
export type DivTag = {
  tag: 'divui'
  attributes: DivProps
}
/**
 * @public
 */
export type TextTag = {
  tag: 'textui'
  attributes: TextProps
}

/**
 * @public
 */
export type JsxTree = (DivTag | TextTag) & {
  children: (JsxTree | null)[]
}
/**
 * @public
 */
export type Tree = JsxTree & {
  _id: number
  entityId: number
}

type TextOpts = Partial<Omit<PBUiText, 'text'>>

declare global {
  namespace JSX {
    // The return type of our JSX Factory
    type Element = JsxTree

    interface HTMLElementTagNameMap {
      divui: DivProps
      textui: TextOpts
    }

    // IntrinsicElementMap grabs all the standard HTML tags in the TS DOM lib.
    type IntrinsicElements = IntrinsicElementMap

    // The following are custom types, not part of TS's known JSX namespace:
    type IntrinsicElementMap = {
      [K in keyof HTMLElementTagNameMap]: {
        [k: string]: any
      }
    }

    type Tag = keyof JSX.IntrinsicElements

    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface Component {}
  }
}
