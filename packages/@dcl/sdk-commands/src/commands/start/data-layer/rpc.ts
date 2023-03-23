import { createDataLayerHost, DataLayerHost, DataServiceDefinition } from '@dcl/inspector'
import { createRpcServer, RpcServer, RpcServerPort } from '@dcl/rpc'

import * as codegen from '@dcl/rpc/dist/codegen'
import { CliComponents } from '../../../components'
import { createFileSystemInterfaceFromFsComponent } from './fs'

export type DataLayerContext = {
  dataLayerHost: DataLayerHost
}

export type DataLayer = {
  rpcServer: RpcServer<DataLayerContext>
  context: DataLayerContext
}

export async function createDataLayer({ fs }: Pick<CliComponents, 'fs'>): Promise<DataLayer> {
  const dataLayerHost = await createDataLayerHost(createFileSystemInterfaceFromFsComponent({ fs }))
  const context: DataLayerContext = {
    dataLayerHost
  }
  const rpcServer = createRpcServer<DataLayerContext>({})

  async function rpcHandler(serverPort: RpcServerPort<DataLayerContext>) {
    // TODO: dataLayer as any
    codegen.registerService(serverPort, DataServiceDefinition, async (_port, _ctx) => dataLayerHost.rpcMethods as any)
  }
  rpcServer.setHandler(rpcHandler)

  return { rpcServer, context }
}
