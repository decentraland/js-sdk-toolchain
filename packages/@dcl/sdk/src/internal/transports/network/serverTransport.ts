import { Transport, TransportMessage, SyncEntity, engine } from '@dcl/ecs'
import { RESERVED_STATIC_ENTITIES } from '@dcl/ecs/dist/engine/entity'
import { isServer } from '~system/EngineApi'

import { serializeCrdtMessages } from '../logger'

export async function createNetworkServerTransport(): Promise<Transport> {
  const resp = await isServer({})
  if (resp.isServer) {
  } else {
  }

  async function sendTo(_message: Uint8Array) {
    // const response = await engineApi.crdtSendNetwork({
    //   data: new Uint8Array(message)
    // })
    const response = { data: [] }
    if (response && response.data && response.data.length) {
      if (commsNetworkSyncTransport.onmessage) {
        for (const byteArray of response.data) {
          commsNetworkSyncTransport.onmessage(byteArray)
        }
      }
    }
  }

  const commsNetworkSyncTransport: Transport = {
    async send(message) {
      try {
        const messages = Array.from(serializeCrdtMessages('SyncNetwork', message, engine))
        if (messages.length) console.log(messages)
        await sendTo(message)
      } catch (error) {
        // this is the console.error of the scene
        // eslint-disable-next-line no-console
        console.error(error)
        // debugger
      }
    },
    filter(message: TransportMessage) {
      // TODO: pointer event result component
      if ((message as any).componentId === 1063) {
        return false
      }

      // filter messages from reserved entities.
      if (message.entityId <= RESERVED_STATIC_ENTITIES) {
        return false
      }
      // If its a new component, we must send it
      if ((message as any).timestamp <= 1) {
        return true
      }

      const sync = SyncEntity.getOrNull(message.entityId)
      if (!sync) return false

      if ((message as any).componentId && sync.componentIds.includes((message as any).componentId)) {
        return true
      }

      return false
    }
  }

  return commsNetworkSyncTransport
}
