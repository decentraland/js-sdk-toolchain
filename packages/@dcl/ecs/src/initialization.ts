/**
 * @alpha * This file initialization is an alpha one. This is based on the old-ecs
 * init and it'll be changing.
 */

import { Engine } from './engine'
import { createRendererTransport } from './systems/crdt/transports/rendererTransport'
import { createNetworkTransport } from './systems/crdt/transports/networkTransport'

const rendererTransport = createRendererTransport()

export const engine = Engine({
  transports: [rendererTransport, createNetworkTransport()]
})

if (dcl) {
  dcl.loadModule('@decentraland/ExperimentalAPI', {}).catch((err: any) => {
    dcl.error(
      `ExperimentalAPI couldn't be loaded, the message to renderer can't be sent without this API.`,
      err
    )
  })

  async function pullRendererMessages() {
    const response = await dcl.callRpc(
      '@decentraland/ExperimentalAPI',
      'messageFromRenderer',
      []
    )

    if (response.data?.length) {
      dcl.log(response)
      if (rendererTransport.onmessage) {
        for (const byteArray of response.data) {
          rendererTransport.onmessage(byteArray)
        }
      }
    }
  }

  dcl.onUpdate((dt: number) => {
    pullRendererMessages().finally(() => engine.update(dt))
  })
}
