import {
  engine,
  IEngine,
  LastWriteWinElementSetComponentDefinition,
  PBUiCanvasInformation,
  UiCanvasInformation as engineUiCanvasInformation
} from '@dcl/ecs'
import { EntityPropTypes, ScaleContext, ScaleUnit, ScaleUnits } from './types'
import { parseUiBackground } from './uiBackground'
import { parseUiTransform } from './uiTransform'

/**
 * @internal
 */
export function parseProps(props: EntityPropTypes) {
  const { uiTransform, uiBackground, ...otherProps } = props
  const uiTransformProps = parseUiTransform(uiTransform)
  const uiBackgroundProps = uiBackground ? { uiBackground: parseUiBackground(uiBackground) } : undefined
  return {
    ...otherProps,
    uiTransform: uiTransformProps,
    ...uiBackgroundProps
  }
}

/**
 * @internal
 */
function getScaleAndUnit(scaleUnit: ScaleUnit): [number, ScaleUnits] {
  if (typeof scaleUnit === 'number') {
    return [scaleUnit, 'vw']
  }

  // the following regex would match any valid CSS unit (i.e: 7rem || 7% || 7vw)
  const [_, value, unit] = scaleUnit.match(/(-?[\d.]+)([a-z%]*)/) as [string, number, ScaleUnits]
  return [Number(value), unit]
}

/**
 * @internal
 */
export function scaleOnDim(scale: number, dim: number, pxRatio: number) {
  return (dim / 100) * (scale / pxRatio)
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
 * @internal
 */
export function calcOnViewport(value: ScaleUnit, ctx: ScaleContext | undefined = getScaleCtx()): number {
  const [scale, unit] = getScaleAndUnit(value)
  if (!ctx) return scale

  const { height, width, ratio } = ctx

  if (unit === 'vh') return scaleOnDim(scale, height, ratio)

  // by default, we scale by 'vw' (width)
  return scaleOnDim(scale, width, ratio)
}
