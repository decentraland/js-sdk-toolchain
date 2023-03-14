import { IEngine } from '@dcl/ecs'
import { createRpcClient } from '@dcl/rpc'
import { WebSocketTransport } from '@dcl/rpc/dist/transports/WebSocket'
import * as codegen from '@dcl/rpc/dist/codegen'
import fp from 'fp-future'

import { DataServiceDefinition } from './proto'
import { createLocalDataLayer } from './local-data-layer'
import { DataLayerInterface, Fs } from './types'

const dataLayerWs = new URLSearchParams(window.location.search).get('ws')

export async function getDataLayerRpc(): Promise<DataLayerInterface> {
  const future = fp<DataLayerInterface>()
  if (!dataLayerWs) {
    future.resolve(createLocalDataLayer({} as Fs))
  } else {
    const ws = new WebSocket(dataLayerWs)

    ws.onopen = async () => {
      const clientTransport = WebSocketTransport(ws)
      const client = await createRpcClient(clientTransport)
      const clientPort = await client.createPort('scene-ctx')
      const serviceClient: DataLayerInterface = codegen.loadService<{ engine: IEngine }, DataServiceDefinition>(
        clientPort,
        DataServiceDefinition
      )
      future.resolve(serviceClient)
    }
  }

  return future
}
