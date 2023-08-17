import { AnyAction } from '@reduxjs/toolkit'
import { RPC, Transport } from '@dcl/mini-rpc'
import { UiRPC } from './types'

export class UiServer extends RPC<UiRPC.Method, UiRPC.Params, UiRPC.Result> {
  constructor(transport: Transport, store: { dispatch: (action: AnyAction) => void }) {
    super(UiRPC.name, transport)

    this.handle('toggle_component', async ({ component, enabled }) => {
      store.dispatch({ type: 'toggle_component', payload: { component, enabled } })
    })

    this.handle('toggle_panel', async ({ panel, enabled }) => {
      store.dispatch({ type: 'toggle_panel', payload: { panel, enabled } })
    })

    this.handle('toggle_gizmos', async ({ enabled }) => {
      store.dispatch({ type: 'toggle_gizmos', payload: { enabled } })
    })

    this.handle('select_assets_tab', async ({ tab }) => {
      store.dispatch({ type: 'select_assets_tab', payload: { tab } })
    })
  }
}
