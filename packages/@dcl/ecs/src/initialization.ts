/**
 * @alpha * This file initialization is an alpha one. This is based on the old-ecs
 * init and it'll be changing.
 */

import { Engine } from './engine'
import { TransportMessage } from './systems/crdt/types'

declare const dcl: DecentralandInterface
let ExperimentalAPI: any | undefined = undefined

export const engine = Engine({
  transports: [createRendererTransport()]
})

if (dcl) {
  dcl
    .loadModule('@decentraland/ExperimentalAPI', {})
    .then((module: any) => {
      ExperimentalAPI = module
    })
    .catch((err: any) => {
      dcl.error(
        `ExperimentalAPI couldn't be loaded, the message to renderer can't be sent without this API.`,
        err
      )
    })

  dcl.onUpdate((dt: number) => {
    engine.update(dt)
  })
}

function createRendererTransport() {
  return {
    type: 'renderer',
    send(message: Uint8Array): void {
      if (ExperimentalAPI) {
        dcl
          .callRpc('ExperimentalAPI', 'sendToRenderer', [{ data: message }])
          .catch(dcl.error)
      }
    },
    onmessage(_message: Uint8Array): void {},
    filter(message: TransportMessage): boolean {
      // Echo message, ignore them
      if (message.transportType === 'renderer') {
        return false
      }

      return !!message
    }
  }
}
