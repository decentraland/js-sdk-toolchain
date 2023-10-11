import { version } from '@dcl/asset-packs/package.json'

export type InspectorConfig = {
  dataLayerRpcWsUrl: string | null
  dataLayerRpcParentUrl: string | null
  binIndexJsUrl: string | null
  disableSmartItems: boolean
  contentUrl: string
  segmentKey: string
}

export type GlobalWithConfig = typeof globalThis & {
  InspectorConfig?: Partial<InspectorConfig>
}

export const CONTENT_URL = version.includes('commit')
  ? 'https://builder-items.decentraland.zone'
  : 'https://builder-items.decentraland.org'

export const SEGMENT_KEY = version.includes('commit')
  ? 'RmfAUVW7o1EEuvYJGqmVjK9q48BUpnCr'
  : '8PrGcB0XsogabYgo02gXqfqVM20KKzva'

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
    segmentKey: params.get('segmentKey') || config?.segmentKey || SEGMENT_KEY
  }
}
