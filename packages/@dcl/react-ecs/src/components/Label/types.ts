import { PBUiText } from '@dcl/ecs'

/**
 * @public
 */
export type UiLabelProps = {
  value: string
  /** default=(1.0,1.0,1.0,1.0) */
  color?: PBUiText['color']
  /** default='center' */
  textAlign?: TextAlign | undefined
  /** default='sans-serif' */
  font?: UiFont | undefined
  /** default='10' */
  fontSize?: number | undefined
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
