import { createRpcServer, RpcServer, RpcServerPort } from '@dcl/rpc'
import * as codegen from '@dcl/rpc/dist/codegen'
import { createEngine, DataServiceDefinition, initRpcMethods } from '@dcl/inspector'

import { CliComponents } from '../../../components'

export type IEngine = ReturnType<typeof createEngine>
export type DataLayerContext = {
  engine: IEngine
}
export type DataLayerRpc = {
  rpcServer: RpcServer<DataLayerContext>
  /**
   * we use the same engine with multiple transports for all the contexts.
   */
  engine: IEngine
}

export async function createDataLayerRpc({ fs }: Pick<CliComponents, 'fs'>): Promise<DataLayerRpc> {
  const engine = createEngine()

  setInterval(() => {
    engine.update(0.016).catch((err: any) => {
      console.error(err)
      debugger
    })
  }, 16)

  // TODO: fs is not matching the types here (fs as any)
  const dataLayer = await initRpcMethods(fs as any, engine)

  const rpcServer = createRpcServer<DataLayerContext>({})
  rpcServer.setHandler(rpcHandler)

  async function rpcHandler(serverPort: RpcServerPort<DataLayerContext>) {
    // TODO: dataLayer as any
    codegen.registerService(serverPort, DataServiceDefinition, async (port, ctx) => dataLayer as any)
  }

  return { rpcServer, engine }
}
