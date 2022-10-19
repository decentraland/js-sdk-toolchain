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

export const { log, error } = initializeDcl(engine, rendererTransport)

export const { wasEntityClicked, isPointerEventActive } =
  initializeEvents(engine)

export const { executeTask } = taskSystem(engine)
