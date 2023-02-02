import { Engine } from '../../packages/@dcl/ecs/src/engine'
import { createPointerEventSystem } from '../../packages/@dcl/ecs/src/systems/events'
import { createInputSystem } from '../../packages/@dcl/ecs/src/engine'
import { createReactBasedUiSystem } from '../../packages/@dcl/react-ecs/src'
import { IEngine as IIEngine, PointerEventsSystem } from '../../packages/@dcl/ecs'

export function setupEngine() {
  const engine = Engine()
  const pointerEventSystem: PointerEventsSystem = createPointerEventSystem(
    engine,
    createInputSystem(engine)
  ) as any as PointerEventsSystem
  const uiRenderer = createReactBasedUiSystem(engine as IIEngine, pointerEventSystem)
  return {
    engine,
    uiRenderer
  }
}
