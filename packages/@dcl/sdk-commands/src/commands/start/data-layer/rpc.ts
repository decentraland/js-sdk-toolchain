import { createDataLayerHost, DataLayerHost, DataServiceDefinition } from '@dcl/inspector'
import { createRpcServer, RpcServer, RpcServerPort } from '@dcl/rpc'

import * as codegen from '@dcl/rpc/dist/codegen'
import { CliComponents } from '../../../components'
import { createFsFromNode } from './fs'

export type DataLayerContext = {
  dataLayerHost: DataLayerHost
}

export type DataLayer = {
  rpcServer: RpcServer<DataLayerContext>
  context: DataLayerContext
}

export async function createDataLayer({ fs }: Pick<CliComponents, 'fs'>): Promise<DataLayer> {
  // TODO: implement createFsFromIFileSystemComponent(fs)
  const dataLayerHost = await createDataLayerHost(createFsFromNode())
  const context: DataLayerContext = {
    dataLayerHost
  }
  const rpcServer = createRpcServer<DataLayerContext>({})

  async function rpcHandler(serverPort: RpcServerPort<DataLayerContext>) {
    // TODO: dataLayer as any
    codegen.registerService(serverPort, DataServiceDefinition, async (_port, ctx) => dataLayerHost.rpcMethods as any)
  }
  rpcServer.setHandler(rpcHandler)

  return { rpcServer, context }
}
