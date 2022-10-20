/// <reference types="@dcl/posix" />

/**
 * @alpha * This file initialization is an alpha one. This is based on the old-ecs
 * init and it'll be changing.
 */

import { Engine } from '../../engine'
import { createRendererTransport } from '../../systems/crdt/transports/rendererTransport'
import { initializeEvents } from './events'
import { initializeDcl } from './dcl'
import { taskSystem } from '../../systems/async-task'

const rendererTransport = createRendererTransport()
export const engine = Engine({
  transports: [rendererTransport]
})

// Dcl Interface
export const { log, error } = initializeDcl(engine, rendererTransport)

// Events
export const { wasEntityClicked, isPointerEventActive } =
  initializeEvents(engine)

// Task System
export const { executeTask } = taskSystem(engine)
export { Task } from '../../systems/async-task'
