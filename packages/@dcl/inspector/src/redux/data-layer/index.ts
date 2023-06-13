import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { RootState } from '../../redux/store'
import { DataLayerRpcClient } from '../../lib/data-layer/types'

export interface DataLayerState {
  dataLayer: DataLayerRpcClient | undefined
  reconnectAttempts: number
  ws: WebSocket | undefined
}

const initialState: DataLayerState = {
  dataLayer: undefined,
  reconnectAttempts: 0,
  ws: undefined
}

export const dataLayer = createSlice({
  name: 'data-layer',
  initialState,
  reducers: {
    connect: (state) => {
      state.reconnectAttempts++
      console.log('[WS] Connecting')
    },
    reconnect: () => {
      console.log('[WS] Reconnecting')
    },
    connected: (state, { payload }: PayloadAction<{ dataLayer: DataLayerState['dataLayer'] }>) => {
      console.log('[WS] Connected')
      state.dataLayer = payload.dataLayer
      state.reconnectAttempts = 0
    }
  }
})

export const { connect, connected, reconnect } = dataLayer.actions
export const getDataLayer = (state: RootState) => state.dataLayer.dataLayer
export const getDataLayerWs = (state: RootState) => state.dataLayer.ws
export const getDataLayerReconnectAttempts = (state: RootState) => state.dataLayer.reconnectAttempts

export default dataLayer.reducer
