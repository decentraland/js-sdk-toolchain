import { isServer } from '~system/EngineApi'

import { NetworkEntityFactory } from './types'
import { createServerTransport } from './server'
import { createClientTransport } from './client'

export let connected = false

export async function createNetworkTransport(url: string): Promise<NetworkEntityFactory> {
  if (connected) {
    throw new Error('Transport is already created')
  }
  const networkFactory = await (isServer && (await isServer({})).isServer
    ? createServerTransport()
    : createClientTransport(url))
  connected = true
  return networkFactory
}
