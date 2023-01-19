import { Font, TextAlignMode } from '@dcl/ecs'
import { TextAlign, UiFont } from './types'

const parseFont: Readonly<Record<UiFont, Font>> = {
  'sans-serif': Font.F_SANS_SERIF,
  serif: Font.F_SERIF,
  monospace: Font.F_MONOSPACE
}
/**
 * @internal
 */
export function getFont(
  font: UiFont | undefined
): Record<'font', Font> | undefined {
  if (!font) return undefined
  return { font: parseFont[font] }
}

const parseTextAlign: Readonly<Record<TextAlign, TextAlignMode>> = {
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
export function getTextAlign(
  textAlign: TextAlign | undefined
): Record<'textAlign', TextAlignMode> | undefined {
  if (!textAlign) return undefined
  return { textAlign: parseTextAlign[textAlign] }
}
