/**
 * @alpha * This file initialization is an alpha one. This is based on the old-ecs
 * init and it'll be changing.
 */

import { Engine, IEngine } from '../../engine'
import { Task, createTaskSystem } from '../../systems/async-task'
import { createPointerEventSystem } from '../../systems/events'
import { createInputSystem } from './../../engine/input'

/*#__PURE__*/
export const engine: IEngine = Engine()

// INPUT Manager
/*#__PURE__*/
export const inputSystem = createInputSystem(engine)
/*#__PURE__*/
export const pointerEventsSystem = createPointerEventSystem(engine, inputSystem)

/**
 * @public
 */
/*#__PURE__*/
export const executeTask = createTaskSystem(engine).executeTask
export type { Task }
