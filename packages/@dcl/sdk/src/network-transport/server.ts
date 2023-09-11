import { engine, SyncEntity, Transport } from '@dcl/ecs'
import { serializeCrdtMessages } from '../internal/transports/logger'
import { engineToCrdt } from './state'
import { syncFilter, createNetworkManager } from './utils'
import { NetworkManager, ServerTransportConfig } from './types'
import { PlayersConnected } from '.'

export async function createServerTransport(config: ServerTransportConfig): Promise<NetworkManager> {
  const connectedClients = new Set<string>()
  engine.addTransport({
    send: async (message) => {
      if (message.byteLength) {
        globalThis.updateCRDTState(engineToCrdt())
      }
    },
    filter: syncFilter
  })
  globalThis.registerScene(config, (event) => {
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
    PlayersConnected.createOrReplace(players, { usersId: [...connectedClients.values()].map(String) })
  })

  const networkEntityFactory = createNetworkManager(config.reservedLocalEntities, [
    config.reservedLocalEntities,
    config.reservedLocalEntities + config.networkEntitiesLimit.serverLimit
  ])
  const players = networkEntityFactory.addEntity()
  SyncEntity.create(players, { componentIds: [PlayersConnected.componentId] })
  return networkEntityFactory
}
