import { createDataLayerHost } from '../host'
import { DataLayerRpcClient } from '../types'
import { feededFileSystem } from './feeded-local-fs'

/**
 * This RpcClient creates internally the DataLayer HOST, implementing its own file system interface and engine.
 * @param fs
 * @returns
 */
export async function createLocalDataLayerRpcClient(): Promise<DataLayerRpcClient> {
  const fs = await feededFileSystem()
  const localDataLayerHost = await createDataLayerHost(fs)
  return localDataLayerHost.rpcMethods as DataLayerRpcClient
}
