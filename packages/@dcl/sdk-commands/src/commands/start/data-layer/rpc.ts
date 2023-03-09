import { createRpcServer, RpcServerPort } from '@dcl/rpc'
import * as codegen from '@dcl/rpc/dist/codegen'
import { DataServiceDefinition } from '@dcl/protocol/out-js/decentraland/sdk/editor/data_service.gen'
import { createRemoteDataLayer } from '@dcl/inspector/src/lib/data-layer/remote-data-layer'

// eslint-disable-next-line @typescript-eslint/ban-types
export type DataLayerContext = {}

export function createDataLayerRpc() {
  const dataLayer = createRemoteDataLayer({} as any)
  const rpcServer = createRpcServer<DataLayerContext>({})
  rpcServer.setHandler(rpcHandler)

  async function rpcHandler(serverPort: RpcServerPort<DataLayerContext>) {
    codegen.registerService(serverPort, DataServiceDefinition, async () => dataLayer)
  }

  return rpcServer
}
