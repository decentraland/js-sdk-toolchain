import { IEngine } from '@dcl/ecs'
import { createRpcClient } from '@dcl/rpc'
import { WebSocketTransport } from '@dcl/rpc/dist/transports/WebSocket'
import * as codegen from '@dcl/rpc/dist/codegen'

import { DataServiceDefinition } from './todo-protobuf'
import { createLocalDataLayer } from './local-data-layer'
import { DataLayerInterface, Fs } from './types'

export async function getDataLayerRpc(): Promise<DataLayerInterface> {
  if (process.env.NO_RPC) {
    return createLocalDataLayer({} as Fs)
  }

  // TODO: get port
  const ws = new WebSocket('ws://localhost:8001/data-layer')
  const clientTransport = WebSocketTransport(ws)
  const client = await createRpcClient(clientTransport)
  const clientPort = await client.createPort('Scene')
  const serviceClient = codegen.loadService<{ engine: IEngine }, DataServiceDefinition>(
    clientPort,
    DataServiceDefinition
  )
  return serviceClient
}
