import { createFileSystemInterface } from '../../logic/file-system-interface'
import { createIframeStorage } from '../../logic/storage'
import { createDataLayerHost } from '../host'
import { DataLayerRpcClient } from '../types'

export async function createIframeDataLayerRpcClient(origin: string): Promise<DataLayerRpcClient> {
  const storage = createIframeStorage(origin)
  const fs = createFileSystemInterface(storage)
  const localDataLayerHost = await createDataLayerHost(fs)
  return localDataLayerHost.rpcMethods as DataLayerRpcClient
}
