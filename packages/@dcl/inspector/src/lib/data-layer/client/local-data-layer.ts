import { createEngine } from '../host/engine'
import { initRpcMethods } from '../host/rpc-methods'
import { DataLayerRpcClient, DataLayerRpcServer, FileSystemInterface } from '../types'

function wrapRpcClientFromRpcServer(server: DataLayerRpcServer): DataLayerRpcClient {
  return server as any as DataLayerRpcClient
}

/**
 * This RpcClient creates internally the server, implementing its own file system interface and engine.
 * @param fs
 * @returns
 */
export async function createLocalDataLayerRpcClient(fs: FileSystemInterface): Promise<DataLayerRpcClient> {
  const engine = createEngine()

  // the server (datalayer) should also keep its internal "game loop" to process
  // all the incoming messages. we have this interval easy solution to mock that
  // game loop for the time being.
  // since the servers DO NOT run any game system, the only thing it does is to
  // process incoming and outgoing messages + dirty states
  setInterval(() => {
    engine.update(0.016).catch(($) => {
      console.error($)
      debugger
    })
  }, 16)

  const hostRpc = await initRpcMethods(fs, engine)

  return wrapRpcClientFromRpcServer(hostRpc)
}
