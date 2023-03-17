import { createRpcServer, RpcServer, RpcServerPort } from '@dcl/rpc'
import * as codegen from '@dcl/rpc/dist/codegen'
import { createEngine, initRpcMethods, DataLayerProto } from '@dcl/inspector'

import { CliComponents } from '../../../components'

export type IEngine = ReturnType<typeof createEngine>
export type DataLayerContext = {
  engine: IEngine
}
export type DataLayerRPC = {
  rpcServer: RpcServer<DataLayerContext>
  /**
   * we use the same engine with multiple transports for all the contexts.
   */
  engine: IEngine
}

export function createDataLayerRpc({ fs }: Pick<CliComponents, 'fs'>): DataLayerRPC {
  const engine = createEngine()

  setInterval(() => {
    engine.update(0.016).catch((err: any) => {
      console.error(err)
      debugger
    })
  }, 16)

  const dataLayer = initRpcMethods(fs, engine)
  const rpcServer = createRpcServer<DataLayerContext>({})
  rpcServer.setHandler(rpcHandler)

  async function rpcHandler(serverPort: RpcServerPort<DataLayerContext>) {
    codegen.registerService(serverPort, DataLayerProto.DataServiceDefinition, async (port, ctx) => dataLayer)
  }

  return { rpcServer, engine }
}
