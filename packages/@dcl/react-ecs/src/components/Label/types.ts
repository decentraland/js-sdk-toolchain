import { PBUiText } from '@dcl/ecs'

/**
 * @public
 */
export type UiLabelProps = Omit<PBUiText, 'textAlign' | 'font'> & {
  /** default='middle-center' */
  textAlign?: TextAlignType | undefined
  /** default='sans-serif' */
  font?: UiFontType | undefined
}

/**
 * @public
 */
export type UiFontType = 'sans-serif' | 'serif' | 'monospace'
/**
 * @public
 */
export type TextAlignType =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'middle-left'
  | 'middle-center'
  | 'middle-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'
