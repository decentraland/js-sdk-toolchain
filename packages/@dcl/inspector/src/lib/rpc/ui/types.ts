import { AssetsTab, PanelName, SceneInspectorTab } from '../../../redux/ui/types'

export namespace UiRPC {
  export const name = 'UiRPC'

  export enum Method {
    TOGGLE_COMPONENT = 'toggle_component',
    TOGGLE_PANEL = 'toggle_panel',
    TOGGLE_GIZMOS = 'toggle_gizmos',
    SELECT_ASSETS_TAB = 'select_assets_tab',
    SELECT_SCENE_INSPECTOR_TAB = 'select_scene_inspector_tab',
    TOGGLE_SCENE_INSPECTOR_TAB = 'toggle_scene_inspector_tab',
    TOGGLE_GROUND_GRID = 'toggle_ground_grid'
  }

  export type Params = {
    [Method.TOGGLE_COMPONENT]: { component: string; enabled: boolean }
    [Method.TOGGLE_PANEL]: { panel: `${PanelName}`; enabled: boolean }
    [Method.TOGGLE_GIZMOS]: { enabled: boolean }
    [Method.SELECT_ASSETS_TAB]: { tab: `${AssetsTab}` }
    [Method.SELECT_SCENE_INSPECTOR_TAB]: { tab: `${SceneInspectorTab}` }
    [Method.TOGGLE_SCENE_INSPECTOR_TAB]: { tab: `${SceneInspectorTab}`; enabled: boolean }
    [Method.TOGGLE_GROUND_GRID]: { enabled: boolean }
  }

  export type Result = {
    [Method.TOGGLE_COMPONENT]: void
    [Method.TOGGLE_PANEL]: void
    [Method.TOGGLE_GIZMOS]: void
    [Method.SELECT_ASSETS_TAB]: void
    [Method.SELECT_SCENE_INSPECTOR_TAB]: void
    [Method.TOGGLE_SCENE_INSPECTOR_TAB]: void
    [Method.TOGGLE_GROUND_GRID]: void
  }
}
