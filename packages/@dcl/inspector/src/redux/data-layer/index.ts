import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { RootState } from '../../redux/store'
import { DataLayerRpcClient } from '../../lib/data-layer/types'

export enum ErrorType {
  Disconnected = 'disconnected',
  Reconnecting = 'reconnecting'
}

export interface DataLayerState {
  dataLayer: DataLayerRpcClient | undefined
  reconnectAttempts: number
  error: ErrorType | undefined
}

export const initialState: DataLayerState = {
  dataLayer: undefined,
  reconnectAttempts: 0,
  error: undefined
}

export const dataLayer = createSlice({
  name: 'data-layer',
  initialState,
  reducers: {
    connect: (state) => {
      state.reconnectAttempts++
      console.log('[WS] Connecting')
    },
    reconnect: (state) => {
      console.log('[WS] Reconnecting')
      state.error = ErrorType.Reconnecting
      state.dataLayer = undefined
    },
    connected: (state, { payload }: PayloadAction<{ dataLayer: DataLayerState['dataLayer'] }>) => {
      console.log('[WS] Connected')
      state.dataLayer = payload.dataLayer
      state.reconnectAttempts = 0
      state.error = undefined
    },
    error: (state, { payload }: PayloadAction<{ error: ErrorType }>) => {
      console.log('[WS] Error', payload.error)
      state.error = payload.error
    }
  }
})

export const { connect, connected, reconnect, error } = dataLayer.actions
export const getError = (state: RootState) => state.dataLayer.error
export const getDataLayer = (state: RootState) => state.dataLayer.dataLayer
export const getDataLayerReconnectAttempts = (state: RootState) => state.dataLayer.reconnectAttempts

export default dataLayer.reducer
