export type InspectorConfig = {
  dataLayerRpcWsUrl: string | null
  dataLayerRpcParentUrl: string | null
  disableInstallBinJs: boolean
  disableSmartItems: boolean
}

export type WindowWithConfig = {
  InspectorConfig?: Partial<InspectorConfig>
}

export function getConfig(): InspectorConfig {
  const config = (window as WindowWithConfig).InspectorConfig
  const params = new URLSearchParams(location.search)
  return {
    dataLayerRpcWsUrl: params.get('ws') || params.get('dataLayerRpcWsUrl') || config?.dataLayerRpcWsUrl || null,
    dataLayerRpcParentUrl:
      params.get('parent') || params.get('dataLayerRpcParentUrl') || config?.dataLayerRpcParentUrl || null,
    disableInstallBinJs: params.has('disableInstallBinJs') || !!config?.disableInstallBinJs,
    disableSmartItems: params.has('disableSmartItems') || !!config?.disableSmartItems
  }
}
