import { createDataLayerHost } from '../host'
import { DataLayerRpcClient, FileSystemInterface } from '../types'

/**
 * This RpcClient creates internally the DataLayer HOST, implementing its own file system interface and engine.
 * @param fs
 * @returns
 */
export async function createLocalDataLayerRpcClient(fs: FileSystemInterface): Promise<DataLayerRpcClient> {
  const localDataLayerHost = await createDataLayerHost(fs)
  return localDataLayerHost.rpcMethods as any as DataLayerRpcClient
}
