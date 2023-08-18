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
      console.log('tabsss', tab)
      store.dispatch({ type: 'ui/selectAssetsTab', payload: { tab } })
    })
  }
}
