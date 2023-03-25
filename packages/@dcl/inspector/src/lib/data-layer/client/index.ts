import { DataLayerRpcClient } from '../types'
import { feededFileSystem } from './feededLocalFs'
import { createLocalDataLayerRpcClient } from './local-data-layer'
import { createWebSocketDataLayerRpcClient } from './ws-data-layer'

const dataLayerWs = new URLSearchParams(window.location.search).get('ws')

export async function createDataLayerClientRpc(): Promise<DataLayerRpcClient> {
  if (!dataLayerWs) {
    const fs = await feededFileSystem()
    return createLocalDataLayerRpcClient(fs)
  } else {
    return createWebSocketDataLayerRpcClient(dataLayerWs)
  }
}
