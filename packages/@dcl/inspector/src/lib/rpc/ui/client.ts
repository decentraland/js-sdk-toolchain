import { RPC, Transport } from '@dcl/mini-rpc'
import { UiRPC } from './types'
import { AssetsTab, PanelName, SceneInspectorTab } from '../../../redux/ui/types'

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

  toggleGroundGrid = (enabled: boolean) => {
    return this.request('toggle_ground_grid', { enabled })
  }

  selectAssetsTab = (tab: `${AssetsTab}`) => {
    return this.request('select_assets_tab', { tab })
  }

  selectSceneInspectorTab = (tab: `${SceneInspectorTab}`) => {
    return this.request('select_scene_inspector_tab', { tab })
  }

  toggleSceneInspectorTab = (tab: `${SceneInspectorTab}`, enabled: boolean) => {
    return this.request('toggle_scene_inspector_tab', { tab, enabled })
  }
}
