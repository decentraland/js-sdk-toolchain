import { engine, Font, TextAlignMode, UiCanvasInformation } from '@dcl/ecs'
import { FontSizeScaleUnit, ScaleUnit, TextAlignType, UiFontType } from './types'

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

function parseFontSizeScale(value: FontSizeScaleUnit): [number, ScaleUnit] {
  if (typeof value === 'number') {
    return [value, 'vw']
  }

  const _value = Number(value.slice(0, -2))
  const unit = value.slice(-2) as ScaleUnit
  return [_value, unit]
}

function calculateScaledFontSize(fontSize: number, scale: number, dim: number, pxRatio: number): number {
  return fontSize + (dim / 100) * (scale / pxRatio)
}

/**
 * Scales a font size depending on viewport width/height
 * @param fontSize size of the font to scale
 * @param scaleUnit the scaling factor + an optional unit (vw/vh) - default: 0.39vw
 * @returns the fontSize scaled
 * @see https://matthewjamestaylor.com/responsive-font-size#fluid
 * @public
 */
export function scaleFontSize(fontSize: number, scaleUnit: FontSizeScaleUnit = 0.39): number {
  const canvasInfo = UiCanvasInformation.getOrNull(engine.RootEntity)
  // it shouldn't be null, but just in case...
  if (!canvasInfo) return fontSize

  const { height, width, devicePixelRatio } = canvasInfo
  const [scale, unit] = parseFontSizeScale(scaleUnit)

  if (unit === 'vh') return calculateScaledFontSize(fontSize, scale, height, devicePixelRatio)

  // by default, we scale by 'vw' (canvas width)
  return calculateScaledFontSize(fontSize, scale, width, devicePixelRatio)
}
