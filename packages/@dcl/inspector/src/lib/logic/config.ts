export type InspectorConfig = {
  dataLayerRpcWsUrl: string | null
  dataLayerRpcParentUrl: string | null
  binIndexJsUrl: string | null
  disableSmartItems: boolean
  contentUrl: string
}

export type GlobalWithConfig = typeof globalThis & {
  InspectorConfig?: Partial<InspectorConfig>
}

export const CONTENT_URL = 'https://builder-items.decentraland.org'

export function getConfig(): InspectorConfig {
  const config = (globalThis as GlobalWithConfig).InspectorConfig
  const params = new URLSearchParams(globalThis?.location?.search || '')
  return {
    dataLayerRpcWsUrl: params.get('ws') || params.get('dataLayerRpcWsUrl') || config?.dataLayerRpcWsUrl || null,
    dataLayerRpcParentUrl:
      params.get('parent') || params.get('dataLayerRpcParentUrl') || config?.dataLayerRpcParentUrl || null,
    binIndexJsUrl: params.get('binIndexJsUrl') || config?.binIndexJsUrl || null,
    disableSmartItems: params.has('disableSmartItems') || !!config?.disableSmartItems,
    contentUrl: params.get('contentUrl') || config?.contentUrl || CONTENT_URL
  }
}
