import type { IEngine, PointerEventsSystem } from '@dcl/ecs'
import * as ecsComponents from '@dcl/ecs/dist/components'
import React from 'react'
import type { ReactEcs } from './react-ecs'
import { createReconciler } from './reconciler'
import { getUiScaleFactor, setUiScaleFactor } from './components/utils'

/**
 * @public
 */
export type UiComponent = () => ReactEcs.JSX.ReactNode

/**
 * @public
 */
export type UiRendererOptions = {
  virtualWidth: number
  virtualHeight: number
}

/**
 * @public
 */
export interface ReactBasedUiSystem {
  destroy(): void
  setUiRenderer(ui: UiComponent, options?: UiRendererOptions): void
}

/**
 * @public
 */
export function createReactBasedUiSystem(engine: IEngine, pointerSystem: PointerEventsSystem): ReactBasedUiSystem {
  const renderer = createReconciler(engine, pointerSystem)
  let uiComponent: UiComponent | undefined = undefined
  let virtualSize: UiRendererOptions | undefined = undefined
  function ReactBasedUiSystem() {
    if (uiComponent) renderer.update(React.createElement(uiComponent as any))
  }

  function UiScaleSystem() {
    if (!virtualSize) {
      if (getUiScaleFactor() !== 1) setUiScaleFactor(1)
      return
    }

    const UiCanvasInformation = ecsComponents.UiCanvasInformation(engine)
    const canvasInfo = UiCanvasInformation.getOrNull(engine.RootEntity)
    if (!canvasInfo) return

    const { width, height } = canvasInfo
    const { virtualWidth, virtualHeight } = virtualSize
    if (!virtualWidth || !virtualHeight) return

    const nextScale = Math.min(width / virtualWidth, height / virtualHeight)
    if (Number.isFinite(nextScale) && nextScale !== getUiScaleFactor()) {
      setUiScaleFactor(nextScale)
    }
  }

  engine.addSystem(UiScaleSystem, 100e3 + 1, '@dcl/react-ecs-ui-scale')
  engine.addSystem(ReactBasedUiSystem, 100e3, '@dcl/react-ecs')

  return {
    destroy() {
      engine.removeSystem(UiScaleSystem)
      engine.removeSystem(ReactBasedUiSystem)
      setUiScaleFactor(1)
      for (const entity of renderer.getEntities()) {
        engine.removeEntity(entity)
      }
    },
    setUiRenderer(ui: UiComponent, options?: UiRendererOptions) {
      uiComponent = ui
      virtualSize = options
    }
  }
}
