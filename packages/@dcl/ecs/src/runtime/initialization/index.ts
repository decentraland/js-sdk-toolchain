/**
 * @alpha * This file initialization is an alpha one. This is based on the old-ecs
 * init and it'll be changing.
 */

import { Engine, IEngine } from '../../engine'
import { Task, taskSystem } from '../../systems/async-task'
import { EventsSystem } from '../../systems/events'
import { createInput } from './../../engine/input'

export const engine: IEngine = Engine()

// INPUT Manager
/**
 * @public
 */
export const Input = createInput(engine)

/**
 * @public
 * Execute async task
 */
export const executeTask = taskSystem(engine).executeTask
export type { Task }
export { EventsSystem }
engine.addSystem(EventsSystem.update(Input))
