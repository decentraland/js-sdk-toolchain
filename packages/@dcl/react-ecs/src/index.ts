import { engine, pointerEventsSystem } from '@dcl/ecs'
import { ReactEcs } from './react-ecs'
import { createReactBasedUiSystem, ReactBasedUiSystem } from './system'

export * from './components'
export * from './system'
export * from './react-ecs'

/**
 * ReactEcs variable provides the function to render & destroy the specified UI
 * @public
 * @example
 * import { ReactEcsRenderer } from '@dcl/sdk/react-ecs'
 * ReactEcsRenderer.setUiRenderer(uiComponent)
 */
/*#__PURE__*/
export const ReactEcsRenderer: ReactBasedUiSystem = createReactBasedUiSystem(
  engine,
  pointerEventsSystem
)

export default ReactEcs
