import { Entity, engine } from '@dcl/ecs'

import type { JSX } from './react-ecs'
import { createReconciler } from './reconciler'

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
