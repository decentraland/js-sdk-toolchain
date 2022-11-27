import { Entity, engine as globalEngine, IEngine } from '@dcl/ecs'

import type { JSX } from './react-ecs'
import { createReconciler } from './reconciler'

export type UiComponent = () => JSX.Element
const uiContainer: { getEntities: () => Entity[]; update: () => void }[] = []

export function renderUi(ui: UiComponent, engine: IEngine = globalEngine) {
  const renderer = createReconciler(engine)
  function update() {
    renderer.update(ui())
  }

  engine.addSystem(update)
  return uiContainer.push({ update, getEntities: renderer.getEntities }) - 1
}

export function removeUi(index: number, engine: IEngine = globalEngine) {
  const ui = uiContainer[index]
  if (!ui) return

  uiContainer.splice(index, 1)

  engine.removeSystem(ui.update)

  for (const entity of ui.getEntities()) {
    engine.removeEntity(entity)
  }
}
