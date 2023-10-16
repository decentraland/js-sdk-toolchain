import { Transport, engine } from '@dcl/sdk/ecs'

import { syncFilter } from '@dcl/sdk/network-transport/utils'
import { serializeCrdtMessages } from '@dcl/sdk/internal/transports/logger'
import { sendBinary } from '~system/CommunicationsController'

export function addSyncTransport() {
  const transport: Transport = {
    filter: syncFilter,
    send: async (message: Uint8Array) => {
      const messagesToProcess = await sendBinary({ data: message })
      if (messagesToProcess.data.length) {
        if (transport.onmessage) {
          for (const byteArray of messagesToProcess.data) {
            console.log(Array.from(serializeCrdtMessages('[CRDT]: ', byteArray, engine)))
            transport.onmessage(byteArray)
          }
        }
      }
    }
  }
  engine.addTransport(transport)
}
