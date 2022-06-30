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
  // TODO: remove this when the method is in main kernel
  let hasMessageFromRendererMethod = false

  dcl
    .loadModule('@decentraland/ExperimentalAPI', {})
    .then((loadedModule) => {
      if (
        loadedModule.methods.find((item) => item.name === 'messageFromRenderer')
      ) {
        hasMessageFromRendererMethod = true
      }
    })
    .catch((err: any) => {
      dcl.error(
        `ExperimentalAPI couldn't be loaded, the message to renderer can't be sent without this API.`,
        err
      )
    })

  async function pullRendererMessages() {
    if (!hasMessageFromRendererMethod) return

    const response = await dcl.callRpc(
      '@decentraland/ExperimentalAPI',
      'messageFromRenderer',
      []
    )

    if (response.data?.length) {
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
