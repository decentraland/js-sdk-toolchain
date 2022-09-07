/// <reference types="@dcl/posix" />

/**
 * @alpha * This file initialization is an alpha one. This is based on the old-ecs
 * init and it'll be changing.
 */

import { Engine } from '../engine'
import { createRendererTransport } from '../systems/crdt/transports/rendererTransport'
import { createNetworkTransport } from '../systems/crdt/transports/networkTransport'
import { _initEventObservables } from './observables'

const rendererTransport = createRendererTransport()
export const engine = Engine({
  transports: [rendererTransport, createNetworkTransport()]
})

if (typeof dcl !== 'undefined') {
  dcl.loadModule('~system/ExperimentalAPI', {}).catch(dcl.error)

  async function pullRendererMessages() {
    const response = await dcl.callRpc(
      '~system/ExperimentalAPI',
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
    pullRendererMessages()
      .catch(dcl.error)
      .finally(() => engine.update(dt))
  })

  _initEventObservables()
}

export const log = dcl.log
export const error = dcl.error
