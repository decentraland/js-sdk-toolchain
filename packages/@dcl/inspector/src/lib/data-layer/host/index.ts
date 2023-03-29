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

let interval: NodeJS.Timeout
export function stopEngine() {
  clearInterval(interval)
}

export async function createDataLayerHost(fs: FileSystemInterface): Promise<DataLayerHost> {
  const callbackFunctions: OnChangeFunction[] = []
  const engine = createEngine({
    onChangeFunction: (entity, operation, component, componentValue) => {
      callbackFunctions.forEach((func) => func(entity, operation, component, componentValue))
    }
  })
  Object.assign(globalThis, { dataLayerEngine: engine })

  // the server (datalayer) should also keep its internal "game loop" to process
  // all the incoming messages. we have this interval easy solution to mock that
  // game loop for the time being.
  // since the servers DO NOT run any game system, the only thing it does is to
  // process incoming and outgoing messages + dirty states
  interval = setInterval(() => {
    engine.update(0.016).catch(($) => {
      console.error($)
      debugger
    })
  }, 16)

  const rpcMethods = await initRpcMethods(fs, engine, callbackFunctions)

  return {
    rpcMethods,
    engine
  }
}
