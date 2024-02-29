import { AnyAction } from '@reduxjs/toolkit'
import { RPC, Transport } from '@dcl/mini-rpc'
import { UiRPC } from './types'

export class UiServer extends RPC<UiRPC.Method, UiRPC.Params, UiRPC.Result> {
  constructor(transport: Transport, store: { dispatch: (action: AnyAction) => void }) {
    super(UiRPC.name, transport)

    this.handle('toggle_component', async ({ component, enabled }) => {
      store.dispatch({ type: 'ui/toggleComponent', payload: { component, enabled } })
    })

    this.handle('toggle_panel', async ({ panel, enabled }) => {
      store.dispatch({ type: 'ui/togglePanel', payload: { panel, enabled } })
    })

    this.handle('toggle_gizmos', async ({ enabled }) => {
      store.dispatch({ type: 'ui/toggleGizmos', payload: { enabled } })
    })

    this.handle('select_assets_tab', async ({ tab }) => {
      store.dispatch({ type: 'ui/selectAssetsTab', payload: { tab } })
    })

    this.handle('select_scene_inspector_tab', async ({ tab }) => {
      store.dispatch({ type: 'ui/selectSceneInspectorTab', payload: { tab } })
    })

    this.handle('toggle_scene_inspector_tab', async ({ tab, enabled }) => {
      store.dispatch({ type: 'ui/toggleSceneInspectorTab', payload: { tab, enabled } })
    })

    this.handle('toggle_ground_grid', async ({ enabled }) => {
      store.dispatch({ type: 'ui/toggleGroundGrid', payload: { enabled } })
    })
  }
}
