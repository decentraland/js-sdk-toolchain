import { Engine } from '../../packages/@dcl/ecs/src/engine'
import { createPointerEventsSystem } from '../../packages/@dcl/ecs/src/systems/events'
import { createInputSystem } from '../../packages/@dcl/ecs/src/engine'
import { createReactBasedUiSystem, UiRendererOptions } from '../../packages/@dcl/react-ecs/src'
import { IEngine, PointerEventsSystem } from '../../packages/@dcl/ecs'

/**
 * Renderer options for suites that assert the UI tree hanging directly off the
 * canvas root. The default inset ('interactable') adds a wrapper entity between
 * the two, which is what `ui-renderer-screen-inset.spec.tsx` is there to cover
 * and is noise everywhere else.
 */
export const WHOLE_SCREEN: UiRendererOptions = { screenInset: 'none' }

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
