import type { IEngine, PointerEventsSystem } from '@dcl/ecs'

import type { JSX } from './react-ecs'
import { createReconciler } from './reconciler'

export type UiComponent = () => JSX.Element

export type ReactBasedUiSystem = {
  destroy(): void
  setUiRenderer(ui: UiComponent): void
}

export function createReactBasedUiSystem(
  engine: IEngine,
  pointerSystem: PointerEventsSystem
): ReactBasedUiSystem {
  const renderer = createReconciler(engine, pointerSystem)
  let uiComponent: UiComponent | undefined = undefined

  function ReactBasedUiSystem() {
    if (uiComponent) renderer.update(uiComponent())
  }

  engine.addSystem(ReactBasedUiSystem, 100e3, '@dcl/react-ecs')

  return {
    destroy() {
      engine.removeSystem(ReactBasedUiSystem)
      for (const entity of renderer.getEntities()) {
        engine.removeEntity(entity)
      }
    },
    setUiRenderer(ui: UiComponent) {
      uiComponent = ui
    }
  }
}
