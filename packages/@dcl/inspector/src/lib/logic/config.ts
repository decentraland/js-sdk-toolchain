export type InspectorConfig = {
  dataLayerRpcWsUrl: string | null
  dataLayerRpcParentUrl: string | null
  binIndexJsUrl: string | null
  disableSmartItems: boolean
}

export type GlobalWithConfig = typeof globalThis & {
  InspectorConfig?: Partial<InspectorConfig>
}

export function getConfig(): InspectorConfig {
  const config = (globalThis as GlobalWithConfig).InspectorConfig
  const params = new URLSearchParams(location ? location.search : '')
  return {
    dataLayerRpcWsUrl: params.get('ws') || params.get('dataLayerRpcWsUrl') || config?.dataLayerRpcWsUrl || null,
    dataLayerRpcParentUrl:
      params.get('parent') || params.get('dataLayerRpcParentUrl') || config?.dataLayerRpcParentUrl || null,
    binIndexJsUrl: params.get('binIndexJsUrl') || config?.binIndexJsUrl || null,
    disableSmartItems: params.has('disableSmartItems') || !!config?.disableSmartItems
  }
}
