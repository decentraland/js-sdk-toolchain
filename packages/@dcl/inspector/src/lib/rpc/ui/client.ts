import { RPC, Transport } from '@dcl/mini-rpc'
import { UiRPC } from './types'
import { AssetsTab, PanelName } from '../../../redux/ui/types'

export class UiClient extends RPC<UiRPC.Method, UiRPC.Params, UiRPC.Result> {
  constructor(transport: Transport) {
    super(UiRPC.name, transport)
  }

  toggleComponent = (component: string, enabled: boolean) => {
    return this.request('toggle_component', { component, enabled })
  }

  togglePanel = (panel: `${PanelName}`, enabled: boolean) => {
    return this.request('toggle_panel', { panel, enabled })
  }

  toggleGizmos = (enabled: boolean) => {
    return this.request('toggle_gizmos', { enabled })
  }

  selectAssetTab = (tab: `${AssetsTab}`) => {
    return this.request('select_assets_tab', { tab })
  }
}
