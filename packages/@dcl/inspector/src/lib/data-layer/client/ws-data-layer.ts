import { createRpcClient } from '@dcl/rpc'
import { WebSocketTransport } from '@dcl/rpc/dist/transports/WebSocket'
import { DataLayerRpcClient } from '../types'
import * as codegen from '@dcl/rpc/dist/codegen'
import { DataServiceDefinition } from '../proto/gen/data-layer.gen'
import { IEngine } from '@dcl/ecs'

export function createWebSocketDataLayerRpcClient(dataLayerWebSocketUrl: string): Promise<DataLayerRpcClient> {
  // TODO: should be some persistent logic to reconnect in case of failure or disconnection? YES
  return new Promise((resolve, _reject) => {
    const ws = new WebSocket(dataLayerWebSocketUrl)
    ws.onopen = async () => {
      const clientTransport = WebSocketTransport(ws)
      const client = await createRpcClient(clientTransport)
      const clientPort = await client.createPort('scene-ctx')
      const serviceClient: DataLayerRpcClient = codegen.loadService<{ engine: IEngine }, DataServiceDefinition>(
        clientPort,
        DataServiceDefinition
      )
      resolve(serviceClient)
    }
  })
}
