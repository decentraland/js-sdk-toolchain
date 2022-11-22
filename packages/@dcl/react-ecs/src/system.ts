import type { IEngine, Entity } from '@dcl/ecs'

import type { JSX } from './react-ecs'
import { createReconciler } from './reconciler'

// TODO: this wont work anymore with the new approach.
// import { engine } from '@dcl/sdk'
// Maybe we can pass the engine to renderUi,
// or compile it globally via esbuild so the engine is available.
declare const engine: IEngine

export type UiComponent = () => JSX.Element
const uiContainer: { getEntities: () => Entity[]; update: () => void }[] = []

export function renderUi(ui: UiComponent) {
  const renderer = createReconciler(engine)
  function update() {
    renderer.update(ui())
  }

  engine.addSystem(update)
  return uiContainer.push({ update, getEntities: renderer.getEntities }) - 1
}

export function removeUi(index: number) {
  const ui = uiContainer[index]
  if (!ui) return

  uiContainer.splice(index, 1)

  engine.removeSystem(ui.update)

  for (const entity of ui.getEntities()) {
    engine.removeEntity(entity)
  }
}
