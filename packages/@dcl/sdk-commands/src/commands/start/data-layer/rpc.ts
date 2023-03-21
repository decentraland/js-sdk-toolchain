import { createEngine, DataServiceDefinition, initRpcMethods } from '@dcl/inspector'
import { createRpcServer, RpcServer, RpcServerPort } from '@dcl/rpc'
import * as codegen from '@dcl/rpc/dist/codegen'
<<<<<<< HEAD
import { createEngine, DataServiceDefinition, initRpcMethods } from '@dcl/inspector'
=======
>>>>>>> feat/integrate-data-layer-filesystem

import { CliComponents } from '../../../components'
import { createFsFromNode } from './fs'

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
  const callbackFunctions: any[] = []
  const engine = createEngine({
    onChangeFunction: (entity, operation, component, componentValue) => {
      callbackFunctions.forEach((func) => func(entity, operation, component, componentValue))
    }
  })
  setInterval(() => {
    engine.update(0.016).catch((err: any) => {
      console.error(err)
      debugger
    })
  }, 16)

  const dataLayer = await initRpcMethods(createFsFromNode(), engine, callbackFunctions)

  const rpcServer = createRpcServer<DataLayerContext>({})
  rpcServer.setHandler(rpcHandler)

  async function rpcHandler(serverPort: RpcServerPort<DataLayerContext>) {
    // TODO: dataLayer as any
    codegen.registerService(serverPort, DataServiceDefinition, async (port, ctx) => dataLayer as any)
  }

  return { rpcServer, engine }
}
