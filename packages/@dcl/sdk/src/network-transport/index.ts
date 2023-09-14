import { isServer } from '~system/EngineApi'

import { NetworkManager, ServerTransportConfig } from './types'
import { Schemas, engine } from '@dcl/ecs'
import { createServerTransport } from './server'
import { ClientTransportConfig, createClientTransport } from './client'

export { NetworkManager } from './types'

export type NetworkTransportConfig = ClientTransportConfig & Partial<ServerTransportConfig>

export let connected = false

const DEFAULT_NETWORK_ENTITY_LIMIT_SERVER = 512
const DEFAULT_NETWORK_ENTITY_LIMIT_CLIENT = 100
const DEFAULT_RESERVED_LOCAL_ENTITIES = 2560

export let reservedLocalEntities: number
/**
 * @alpha
 * Connect to CRDT server
 */
export async function createNetworkManager(config: NetworkTransportConfig): Promise<NetworkManager> {
  if (connected) {
    throw new Error('Transport is already created')
  }

  const serverConfig = {
    networkEntitiesLimit: config.networkEntitiesLimit ?? {
      serverLimit: DEFAULT_NETWORK_ENTITY_LIMIT_SERVER,
      clientLimit: DEFAULT_NETWORK_ENTITY_LIMIT_CLIENT
    },
    reservedLocalEntities: config.reservedLocalEntities || DEFAULT_RESERVED_LOCAL_ENTITIES
  }
  reservedLocalEntities = serverConfig.reservedLocalEntities

  const networkFactory =
    isServer && (await isServer({})).isServer ? createServerTransport(serverConfig) : createClientTransport(config)
  connected = true
  return networkFactory
}

export const PlayersConnected = engine.defineComponent('chore:network:players', {
  usersId: Schemas.Array(Schemas.String)
})
