/**
 * @alpha * This file initialization is an alpha one. This is based on the old-ecs
 * init and it'll be changing.
 */

import { Engine, IEngine } from '../../engine'
import { Task, taskSystem } from '../../systems/async-task'
import { createRendererTransport } from '../../systems/crdt/transports/rendererTransport'
import { EventsSystem } from '../../systems/events'
import { createInput } from './../../engine/input'

const rendererTransport = createRendererTransport()
export const engine: IEngine = Engine({
  transports: [rendererTransport]
})

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
