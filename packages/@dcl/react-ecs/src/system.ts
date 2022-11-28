import { IEngine, PointerEventsSystem } from '@dcl/ecs'

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
  const systemName = '@dcl/react-ecs'
  const systemPriority = 100e3

  return {
    destroy() {
      engine.removeSystem(systemName)
      for (const entity of renderer.getEntities()) {
        engine.removeEntity(entity)
      }
    },
    setUiRenderer(ui: UiComponent) {
      function ReactBasedUiSystem() {
        renderer.update(ui())
      }
      engine.addSystem(ReactBasedUiSystem, systemPriority, systemName)
    }
  }
}
