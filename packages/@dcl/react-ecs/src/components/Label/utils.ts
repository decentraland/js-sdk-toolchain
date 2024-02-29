import { Font, TextAlignMode } from '@dcl/ecs'
import { TextAlignType, UiFontType } from './types'
import { calcOnViewport, getScaleCtx } from '../utils'
import { ScaleContext, ScaleUnit } from '../types'

const parseFont: Readonly<Record<UiFontType, Font>> = {
  'sans-serif': Font.F_SANS_SERIF,
  serif: Font.F_SERIF,
  monospace: Font.F_MONOSPACE
}
/**
 * @internal
 */
export function getFont(font: UiFontType | undefined): Record<'font', Font> | undefined {
  if (!font) return undefined
  return { font: parseFont[font] }
}

const parseTextAlign: Readonly<Record<TextAlignType, TextAlignMode>> = {
  'top-left': TextAlignMode.TAM_TOP_LEFT,
  'top-center': TextAlignMode.TAM_TOP_CENTER,
  'top-right': TextAlignMode.TAM_TOP_RIGHT,
  'middle-left': TextAlignMode.TAM_MIDDLE_LEFT,
  'middle-center': TextAlignMode.TAM_MIDDLE_CENTER,
  'middle-right': TextAlignMode.TAM_MIDDLE_RIGHT,
  'bottom-left': TextAlignMode.TAM_BOTTOM_LEFT,
  'bottom-center': TextAlignMode.TAM_BOTTOM_CENTER,
  'bottom-right': TextAlignMode.TAM_BOTTOM_RIGHT
}

/**
 * @internal
 */
export function getTextAlign(textAlign: TextAlignType | undefined): Record<'textAlign', TextAlignMode> | undefined {
  if (!textAlign) return undefined
  return { textAlign: parseTextAlign[textAlign] }
}

/**
 * @internal
 */
export function getFontSize(fontSize: ScaleUnit | undefined): Record<'fontSize', number> | undefined {
  if (!fontSize) return undefined
  if (typeof fontSize === 'string') return { fontSize: calcOnViewport(fontSize) }
  return { fontSize }
}

/**
 * Scales a font size depending on a context's width/height
 * @param {number} fontSize size of the font to scale
 * @param {ScaleUnit} [scaleUnit=0.39] the scaling unit (uses "width" as unit if a number is supplied)
 * @param {ScaleContext} [ctx=viewport] the context where to apply the scaling
 * @returns {number} the fontSize scaled
 * @see https://matthewjamestaylor.com/responsive-font-size#fluid
 * @public
 */
export function scaleFontSize(
  fontSize: number,
  scaleUnit: ScaleUnit = 0.39,
  ctx: ScaleContext | undefined = getScaleCtx()
): number {
  if (!ctx) return fontSize
  return fontSize + calcOnViewport(scaleUnit, ctx)
}
