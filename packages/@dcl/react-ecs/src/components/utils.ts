import {
  BorderRect,
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

const ZERO_INSETS: BorderRect = { top: 0, left: 0, right: 0, bottom: 0 }

let screenInsetArea: BorderRect = { ...ZERO_INSETS }
let screenInsetAreaOwner: symbol | undefined = undefined

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
 * Sets the global UI scale factor.
 *
 * The `owner` symbol implements a cooperative reset-protection scheme shared
 * with {@link resetUiScaleFactor}:
 *  - Writes always succeed — last writer claims ownership (the most recent
 *    `owner` passed to `set` is the one allowed to `reset`).
 *  - Resets from a non-matching owner are ignored, so a stale system can't
 *    stomp the active scale while another system is driving it.
 *  - A reset called without an owner always wins (used by tests / teardown).
 *
 * @internal
 */
export function setUiScaleFactor(nextScale: number, owner?: symbol): void {
  if (!Number.isFinite(nextScale) || nextScale < 0) return
  if (owner) {
    uiScaleOwner = owner
  }
  uiScaleFactor = nextScale
}

/**
 * @internal
 */
export function resetUiScaleFactor(owner?: symbol): void {
  // No-op for non-owners (see ownership rules on `setUiScaleFactor`).
  // A reset with no owner always wins — used by tests and teardown.
  if (owner && uiScaleOwner !== owner) return
  uiScaleOwner = undefined
  uiScaleFactor = 1
}

/**
 * @internal
 */
export function getScreenInsetArea(): BorderRect {
  return { ...screenInsetArea }
}

/**
 * Sets the global screen inset area.
 *
 * The `owner` symbol implements a cooperative reset-protection scheme shared
 * with {@link resetScreenInsetArea}:
 *  - Writes always succeed — last writer claims ownership (the most recent
 *    `owner` passed to `set` is the one allowed to `reset`).
 *  - Resets from a non-matching owner are ignored, so a stale system can't
 *    stomp the active insets while another system is driving them.
 *  - A reset called without an owner always wins (used by tests / teardown).
 *
 * @internal
 */
export function setScreenInsetArea(next: BorderRect, owner?: symbol): void {
  if (owner) {
    screenInsetAreaOwner = owner
  }
  screenInsetArea = { top: next.top, left: next.left, right: next.right, bottom: next.bottom }
}

/**
 * @internal
 */
export function resetScreenInsetArea(owner?: symbol): void {
  // No-op for non-owners (see ownership rules on `setScreenInsetArea`).
  // A reset with no owner always wins — used by tests and teardown.
  if (owner && screenInsetAreaOwner !== owner) return
  screenInsetAreaOwner = undefined
  screenInsetArea = { ...ZERO_INSETS }
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
