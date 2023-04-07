import { DataLayerRpcClient } from '../types'
import { feededFileSystem } from './feeded-local-fs'
import { createLocalDataLayerRpcClient } from './local-data-layer'
import { createWebSocketDataLayerRpcClient } from './ws-data-layer'

const dataLayerWsByQueryParams = new URLSearchParams(window.location.search).get('ws')
const dataLayerWsByGlobalThis = ((globalThis as any).InspectorConfig?.dataLayerRpcWsUrl as string) || null

const dataLayerWs: string | null = dataLayerWsByQueryParams || dataLayerWsByGlobalThis || null

export async function createDataLayerClientRpc(): Promise<DataLayerRpcClient> {
  if (!dataLayerWs) {
    const fs = await feededFileSystem()
    return createLocalDataLayerRpcClient(fs)
  } else {
    return createWebSocketDataLayerRpcClient(dataLayerWs)
  }
}
