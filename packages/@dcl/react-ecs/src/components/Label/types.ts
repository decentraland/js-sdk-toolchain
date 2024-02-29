import { Color4 } from '@dcl/ecs/dist/components/generated/pb/decentraland/common/colors.gen'
import { ScaleUnit } from '../types'

/**
 * Label component props
 * @public
 */
export interface UiLabelProps {
  /** Primary content. */
  value: string
  /** Color of the label. @defaultValue `{ r: 1, g: 1, b: 1, a: 1 }` */
  color?: Color4 | undefined
  /** Label font size. @defaultValue 10 */
  fontSize?: ScaleUnit | undefined
  /** Label align position. @defaultValue 'middle-center' */
  textAlign?: TextAlignType | undefined
  /** Label font type. @defaultValue 'sans-serif' */
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
