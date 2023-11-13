import { version } from '@dcl/asset-packs/package.json'

export type InspectorConfig = {
  dataLayerRpcWsUrl: string | null
  dataLayerRpcParentUrl: string | null
  binIndexJsUrl: string | null
  disableSmartItems: boolean
  contentUrl: string
  segmentAppId: string | null
  segmentUserId: string | null
  segmentKey: string | null
  projectId: string | null
}

export type GlobalWithConfig = typeof globalThis & {
  InspectorConfig?: Partial<InspectorConfig>
}

export const CONTENT_URL = version.includes('commit')
  ? 'https://builder-items.decentraland.zone'
  : 'https://builder-items.decentraland.org'

export function getConfig(): InspectorConfig {
  const config = (globalThis as GlobalWithConfig).InspectorConfig
  const params = new URLSearchParams(globalThis?.location?.search || '')
  return {
    dataLayerRpcWsUrl: params.get('ws') || params.get('dataLayerRpcWsUrl') || config?.dataLayerRpcWsUrl || null,
    dataLayerRpcParentUrl:
      params.get('parent') || params.get('dataLayerRpcParentUrl') || config?.dataLayerRpcParentUrl || null,
    binIndexJsUrl: params.get('binIndexJsUrl') || config?.binIndexJsUrl || null,
    disableSmartItems: params.has('disableSmartItems') || !!config?.disableSmartItems,
    contentUrl: params.get('contentUrl') || config?.contentUrl || CONTENT_URL,
    segmentAppId: params.get('segmentAppId') || config?.segmentAppId || null,
    segmentUserId: params.get('segmentUserId') || config?.segmentUserId || null,
    segmentKey: params.get('segmentKey') || config?.segmentKey || null,
    projectId: params.get('projectId') || config?.projectId || null
  }
}
