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

let uiScaleFactor = 1
let uiScaleOwner: symbol | undefined = undefined

const ZERO_SAFE_AREA_INSETS = { top: 0, left: 0, right: 0, bottom: 0 } as const
let safeAreaInsets: { top: number; left: number; right: number; bottom: number } = { ...ZERO_SAFE_AREA_INSETS }
let safeAreaOwner: symbol | undefined = undefined

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
export function getScaleAndUnit(scaleUnit: ScaleUnit): [number, ScaleUnits] {
  if (typeof scaleUnit === 'number') {
    return [scaleUnit, 'vw']
  }

  const value = Number(scaleUnit.slice(0, -2))
  if (scaleUnit.endsWith('vh')) return [value, 'vh']
  if (scaleUnit.endsWith('vw')) return [value, 'vw']

  return [NaN, 'vw']
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
export function getUiScaleFactor(): number {
  return uiScaleFactor
}

/**
 * @internal
 */
export function setUiScaleFactor(nextScale: number, owner?: symbol): void {
  if (!Number.isFinite(nextScale) || nextScale < 0) return
  if (owner) {
    // Mark ownership so only that system can reset the scale.
    uiScaleOwner = owner
  }
  uiScaleFactor = nextScale
}

/**
 * @internal
 */
export function resetUiScaleFactor(owner?: symbol): void {
  // Ignore resets from non-owners to avoid stomping active scale.
  if (owner && uiScaleOwner !== owner) return
  uiScaleOwner = undefined
  uiScaleFactor = 1
}

/**
 * Returns the current safe-area insets, in virtual pixels, as last reported
 * by the renderer through `UiCanvasInformation.interactableArea`. Each value
 * is the number of pixels reserved on that edge for platform UI (chat,
 * minimap on desktop) or hardware (notch, home indicator on mobile).
 *
 * Returns zeros until the renderer has reported canvas information at least
 * once.
 *
 * @public
 */
export function getSafeAreaInsets(): { top: number; left: number; right: number; bottom: number } {
  return { ...safeAreaInsets }
}

/**
 * @internal
 */
export function setSafeAreaInsets(
  next: { top: number; left: number; right: number; bottom: number },
  owner?: symbol
): void {
  if (owner) {
    safeAreaOwner = owner
  }
  safeAreaInsets = { top: next.top, left: next.left, right: next.right, bottom: next.bottom }
}

/**
 * @internal
 */
export function resetSafeAreaInsets(owner?: symbol): void {
  if (owner && safeAreaOwner !== owner) return
  safeAreaOwner = undefined
  safeAreaInsets = { ...ZERO_SAFE_AREA_INSETS }
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
