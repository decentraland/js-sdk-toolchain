import { IEngine, OnChangeFunction } from '@dcl/ecs'
import { createEngine } from './utils/engine'
import { initRpcMethods } from '../host/rpc-methods'
import { DataLayerRpcServer, FileSystemInterface } from '../types'

export type DataLayerHost = {
  rpcMethods: DataLayerRpcServer
  engine: IEngine
}

/**
 * This RpcClient creates internally the server, implementing its own file system interface and engine.
 * @param fs
 * @returns
 */

export async function createDataLayerHost(fs: FileSystemInterface): Promise<DataLayerHost> {
  const callbackFunctions: OnChangeFunction[] = []
  const engine = createEngine({
    onChangeFunction: (entity, operation, component, componentValue) => {
      callbackFunctions.forEach((func) => func(entity, operation, component, componentValue))
    }
  })
  Object.assign(globalThis, { dataLayerEngine: engine })

  const rpcMethods = await initRpcMethods(fs, engine, callbackFunctions)

  return {
    rpcMethods,
    engine
  }
}
