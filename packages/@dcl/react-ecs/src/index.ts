import { engine, pointerEventsSystem } from '@dcl/ecs'
import { ReactEcs } from './react-ecs'
import { createReactBasedUiSystem } from './system'

export * from './components'
export * from './system'
export * from './react-ecs'

/*#__PURE__*/
export const ReactEcsRenderer = createReactBasedUiSystem(
  engine,
  pointerEventsSystem
)

export default ReactEcs
