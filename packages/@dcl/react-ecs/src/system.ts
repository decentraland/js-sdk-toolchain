import type { Entity, IEngine, PointerEventsSystem } from '@dcl/ecs'
import React from 'react'
import type { ReactEcs } from './react-ecs'
import { createReconciler, DclReconciler } from './reconciler'

/**
 * @public
 */
export type UiComponent = () => ReactEcs.JSX.ReactNode

/**
 * @public
 */
export interface ReactBasedUiSystem {
  destroy(): void
  setUiRenderer(ui: UiComponent): void
  setTextureRenderer(entity: Entity, ui: UiComponent): void
}

/**
 * @public
 */
export function createReactBasedUiSystem(engine: IEngine, pointerSystem: PointerEventsSystem): ReactBasedUiSystem {
  const renderer = createReconciler(engine, pointerSystem, undefined)
  let uiComponent: UiComponent | undefined = undefined
  const textureRenderersAndUis: [DclReconciler, UiComponent][] = []

  function ReactBasedUiSystem() {
    if (uiComponent) renderer.update(React.createElement(uiComponent as any))
    for (const [textureRenderer, ui] of textureRenderersAndUis) {
      textureRenderer.update(React.createElement(ui() as any))
    }
  }

  engine.addSystem(ReactBasedUiSystem, 100e3, '@dcl/react-ecs')

  return {
    destroy() {
      engine.removeSystem(ReactBasedUiSystem)
      for (const entity of renderer.getEntities()) {
        engine.removeEntity(entity)
      }
      for (const [textureRenderer, _] of textureRenderersAndUis) {
        for (const entity of textureRenderer.getEntities()) {
          engine.removeEntity(entity)
        }
      }
      for (const entity of renderer.getEntities()) {
        engine.removeEntity(entity)
      }
    },
    setUiRenderer(ui: UiComponent) {
      uiComponent = ui
    },
    setTextureRenderer(entity, ui) {
      textureRenderersAndUis.push([createReconciler(engine, pointerSystem, entity), ui])
    }
  }
}
