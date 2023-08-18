import { AssetsTab, PanelName } from '../../../redux/ui/types'

export namespace UiRPC {
  export const name = 'UiRPC'

  export enum Method {
    TOGGLE_COMPONENT = 'toggle_component',
    TOGGLE_PANEL = 'toggle_panel',
    TOGGLE_GIZMOS = 'toggle_gizmos',
    SELECT_ASSETS_TAB = 'select_assets_tab'
  }

  export type Params = {
    [Method.TOGGLE_COMPONENT]: { component: string; enabled: boolean }
    [Method.TOGGLE_PANEL]: { panel: `${PanelName}`; enabled: boolean }
    [Method.TOGGLE_GIZMOS]: { enabled: boolean }
    [Method.SELECT_ASSETS_TAB]: { tab: `${AssetsTab}` }
  }

  export type Result = {
    [Method.TOGGLE_COMPONENT]: void
    [Method.TOGGLE_PANEL]: void
    [Method.TOGGLE_GIZMOS]: void
    [Method.SELECT_ASSETS_TAB]: void
  }
}
