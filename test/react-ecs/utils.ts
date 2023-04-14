import { Engine } from '../../packages/@dcl/ecs/src/engine'
import { createPointerEventsSystem } from '../../packages/@dcl/ecs/src/systems/events'
import { createInputSystem } from '../../packages/@dcl/ecs/src/engine'
import { createReactBasedUiSystem } from '../../packages/@dcl/react-ecs/src'
import { IEngine, PointerEventsSystem } from '../../packages/@dcl/ecs'

export function setupEngine() {
  const engine = Engine()
  const pointerEventSystem = createPointerEventsSystem(engine, createInputSystem(engine))
  const uiRenderer = createReactBasedUiSystem(
    engine as any as IEngine,
    pointerEventSystem as any as PointerEventsSystem
  )
  return {
    engine,
    uiRenderer
  }
}
