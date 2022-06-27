/**
 * @alpha * This file initialization is an alpha one. This is based on the old-ecs
 * init and it'll be changing.
 */

import { Engine } from './engine'
import { createRendererTransport } from './systems/crdt/transports/rendererTransport'
import { createNetworkTransport } from './systems/crdt/transports/networkTransport'

export const engine = Engine({
  transports: [createRendererTransport(), createNetworkTransport()]
})

if (dcl) {
  dcl.loadModule('@decentraland/ExperimentalAPI', {}).catch((err: any) => {
    dcl.error(
      `ExperimentalAPI couldn't be loaded, the message to renderer can't be sent without this API.`,
      err
    )
  })

  dcl.onUpdate((dt: number) => {
    engine.update(dt)
  })
}
