/**
 * @alpha * This file initialization is an alpha one. This is based on the old-ecs
 * init and it'll be changing.
 */

import { Engine } from '../../engine'
import { Task, taskSystem } from '../../systems/async-task'
import { createRendererTransport } from '../../systems/crdt/transports/rendererTransport'
import { EventsSystem } from '../../systems/events'
import { createInput } from './../../engine/input'
import { initializeDcl } from './dcl'

const rendererTransport = createRendererTransport()
export const engine = Engine({
  transports: [rendererTransport]
})

// Dcl Interface
const dclInterface = initializeDcl(engine, rendererTransport)
/**
 * Log function. Only works in debug mode, otherwise it does nothing.
 * @param args - any loggable parameter
 * @public
 */
export const log = dclInterface.log

/**
 * Error function. Prints a console error. Only works in debug mode, otherwise it does nothing.
 * @param error - string or Error object.
 * @param data - any debug information.
 * @public
 */
export const error = dclInterface.error

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
