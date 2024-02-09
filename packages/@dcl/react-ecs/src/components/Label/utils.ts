import {
  engine,
  IEngine,
  UiCanvasInformation as engineUiCanvasInformation,
  PBUiCanvasInformation,
  Font,
  TextAlignMode,
  LastWriteWinElementSetComponentDefinition
} from '@dcl/ecs'
import { FontSizeScaleUnit, ScaleContext, ScaleUnit, TextAlignType, UiFontType } from './types'

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
function parseFontSizeScale(scaleUnit: FontSizeScaleUnit): [number, ScaleUnit] {
  if (typeof scaleUnit === 'number') {
    return [scaleUnit, 'w']
  }

  const value = Number(scaleUnit.slice(0, -1))
  const unit = scaleUnit.slice(-1) as ScaleUnit
  return [value, unit]
}

/**
 * @internal
 */
function calculateScaledFontSize(fontSize: number, scale: number, dim: number, pxRatio: number): number {
  return fontSize + (dim / 100) * (scale / pxRatio)
}

/**
 * @internal
 */
export function getScaleCtx(_engine: IEngine = engine): ScaleContext | undefined {
  const UiCanvasInformation = _engine.getComponent(
    engineUiCanvasInformation.componentId
  ) as LastWriteWinElementSetComponentDefinition<PBUiCanvasInformation>
  const canvasInfo = UiCanvasInformation.getOrNull(_engine.RootEntity)
  if (!canvasInfo) return undefined
  const { width, height, devicePixelRatio } = canvasInfo
  return { width, height, ratio: devicePixelRatio }
}

/**
 * Scales a font size depending on a context's width/height
 * @param {number} fontSize size of the font to scale
 * @param {FontSizeScaleUnit} [scaleUnit=0.39] the scaling unit (uses "width" as unit if a number is supplied)
 * @param {ScaleContext} [ctx=viewport] the context where to apply the scaling
 * @returns {number} the fontSize scaled
 * @see https://matthewjamestaylor.com/responsive-font-size#fluid
 * @public
 */
export function scaleFontSize(
  fontSize: number,
  scaleUnit: FontSizeScaleUnit = 0.39,
  ctx: ScaleContext | undefined = getScaleCtx()
): number {
  if (!ctx) return fontSize

  const { height, width, ratio } = ctx
  const [scale, unit] = parseFontSizeScale(scaleUnit)

  if (unit === 'h') return calculateScaledFontSize(fontSize, scale, height, ratio)

  // by default, we scale by 'w' (width)
  return calculateScaledFontSize(fontSize, scale, width, ratio)
}
