import { engine, Transport } from '@dcl/ecs'
import { serializeCrdtMessages } from '../internal/transports/logger'
import { engineToCrdt } from './state'
import { syncFilter, createNetworkEntityFactory } from './utils'
import { NetworkEntityFactory } from './types'

const connectedClients = new Set<string>()

export async function createServerTransport(): Promise<NetworkEntityFactory> {
  engine.addTransport({
    send: async (message) => {
      if (message.byteLength) {
        globalThis.updateCRDTState(engineToCrdt())
      }
    },
    filter: syncFilter
  })
  globalThis.registerClientObserver((event) => {
    const { type } = event
    if (type === 'open') {
      const { clientId, client } = event
      const transport: Transport = {
        filter: (message) => {
          if (!connectedClients.has(clientId)) return false
          return syncFilter(message)
        },
        send: async (message) => {
          if (message.byteLength > 0) {
            await client.sendCrdtMessage(message)
          }

          if (transport.onmessage) {
            const messages = client.getMessages()
            for (const byteArray of messages) {
              // Log messages
              const logMessages = Array.from(serializeCrdtMessages('RecievedMessages', byteArray, engine))
              if (logMessages.length) {
                console.log(logMessages)
              }
              // Log messages

              transport.onmessage(byteArray)
            }
          }
        }
      }

      engine.addTransport(transport)
      connectedClients.add(event.clientId)
    } else if (type === 'close') {
      connectedClients.delete(event.clientId)
    }
  })

  // TODO: add this to the server context?
  // This numbers should be fetched by the server
  return createNetworkEntityFactory(2560, [2560, 2560 + 512])
}
