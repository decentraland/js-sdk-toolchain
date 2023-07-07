import { createDataLayerHost } from '../host'
import { DataLayerRpcClient } from '../types'
import { feededFileSystem } from './feeded-local-fs'

export async function createIframeDataLayerRpcClient(): Promise<DataLayerRpcClient> {
  const fs = await feededFileSystem()
  const localDataLayerHost = await createDataLayerHost(fs)
  return localDataLayerHost.rpcMethods as DataLayerRpcClient
}
