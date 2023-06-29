import { createDataLayerHost, DataServiceDefinition, DataLayerContext } from '@dcl/inspector'
import { createRpcServer, RpcServer, RpcServerPort } from '@dcl/rpc'
import * as codegen from '@dcl/rpc/dist/codegen'

import { CliComponents } from '../../../components'
import { createFileSystemInterfaceFromFsComponent } from './fs'

export type DataLayer = {
  rpcServer: RpcServer<DataLayerContext>
  context: DataLayerContext
}

export async function createDataLayer(components: Pick<CliComponents, 'fs' | 'logger'>): Promise<DataLayer> {
  const fs = createFileSystemInterfaceFromFsComponent({ fs: components.fs })
  const dataLayerHost = await createDataLayerHost(fs)
  const context: DataLayerContext = {
    fs,
    engine: dataLayerHost.engine
  }
  const rpcServer = createRpcServer<DataLayerContext>({ logger: components.logger })

  rpcServer.setHandler(async function rpcHandler(serverPort: RpcServerPort<DataLayerContext>) {
    codegen.registerService(serverPort, DataServiceDefinition, async (_port, _ctx) => dataLayerHost.rpcMethods)
  })

  return { rpcServer, context }
}
