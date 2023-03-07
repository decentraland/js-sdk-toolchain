import { IEngine } from '@dcl/ecs'
import { createRpcClient } from '@dcl/rpc'
import { WebSocketTransport } from '@dcl/rpc/dist/transports/WebSocket'
import * as codegen from '@dcl/rpc/dist/codegen'

import { DataServiceDefinition } from './todo-protobuf'
import { createSameThreadScene } from './test-local-scene'
import { getLocalDataLayerRpc } from './test-local-scene/rpc'

type Unpacked<T> = T extends (infer U)[]
  ? U
  : T extends (...args: any[]) => infer U
  ? U
  : T extends Promise<infer U>
  ? U
  : T

export type DataLayerInterface = Unpacked<ReturnType<typeof getDataLayerRpc>>

export async function getDataLayerRpc() {
  console.log({ asd: process.env.NO_RPC })
  if (process.env.NO_RPC) {
    const engine = createSameThreadScene()
    return getLocalDataLayerRpc(engine)
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
