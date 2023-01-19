import { PBUiText } from '@dcl/ecs'

/**
 * @public
 */
export type UiLabelProps = Omit<PBUiText, 'textAlign' | 'font'> & {
  /** default='middle-center' */
  textAlign?: TextAlign | undefined
  /** default='sans-serif' */
  font?: UiFont | undefined
}

/**
 * @public
 */
export type UiFont = 'sans-serif' | 'serif' | 'monospace'
/**
 * @public
 */
export type TextAlign =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'middle-left'
  | 'middle-center'
  | 'middle-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'
