import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { RootState } from '../../redux/store'
import { DataLayerRpcClient } from '../../lib/data-layer/types'
import { InspectorPreferences } from '../../lib/logic/preferences/types'
import { Asset, ImportAssetRequest, SaveFileRequest } from '../../lib/data-layer/remote-data-layer'

export enum ErrorType {
  Disconnected = 'disconnected',
  Reconnecting = 'reconnecting',
  Save = 'save',
  GetPreferences = 'get-preferences',
  SetPreferences = 'set-preferences',
  GetAssetCatalog = 'get-asset-catalog',
  Undo = 'undo',
  Redo = 'redo',
  ImportAsset = 'import-asset',
  RemoveAsset = 'remove-asset',
  SaveThumbnail = 'save-thumbnail',
  GetThumbnails = 'get-thumbnails'
}

let dataLayerInterface: DataLayerRpcClient | undefined
export type IDataLayer = Readonly<DataLayerRpcClient | undefined>

// We cant serialize this Client because it has methods
export function getDataLayerInterface(): IDataLayer {
  return dataLayerInterface
}

export interface DataLayerState {
  reconnectAttempts: number
  error: ErrorType | undefined
  removingAsset: Record<string, boolean>
}

export const initialState: DataLayerState = {
  reconnectAttempts: 0,
  error: undefined,
  removingAsset: {}
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
      dataLayerInterface = undefined
    },
    connected: (state, { payload }: PayloadAction<{ dataLayer: IDataLayer }>) => {
      console.log('[WS] Connected')
      dataLayerInterface = payload.dataLayer
      state.reconnectAttempts = 0
      state.error = undefined
    },
    error: (state, { payload }: PayloadAction<{ error: ErrorType }>) => {
      console.log('[WS] Error', payload.error)
      state.error = payload.error
    },
    save: () => {},
    getInspectorPreferences: () => {},
    setInspectorPreferences: (_state, _payload: PayloadAction<Partial<InspectorPreferences>>) => {},
    getAssetCatalog: () => {},
    undo: () => {},
    redo: () => {},
    importAsset: (_state, _payload: PayloadAction<ImportAssetRequest>) => {},
    removeAsset: (state, payload: PayloadAction<Asset>) => {
      state.removingAsset[payload.payload.path] = true
    },
    clearRemoveAsset: (state, payload: PayloadAction<Asset>) => {
      delete state.removingAsset[payload.payload.path]
    },
    saveThumbnail: (_state, _payload: PayloadAction<SaveFileRequest>) => {},
    getThumbnails: () => {}
  }
})

// Actions
export const {
  connect,
  connected,
  reconnect,
  error,
  save,
  getInspectorPreferences,
  setInspectorPreferences,
  getAssetCatalog,
  undo,
  redo,
  importAsset,
  removeAsset,
  clearRemoveAsset,
  saveThumbnail,
  getThumbnails
} = dataLayer.actions

// Selectors
export const selectDataLayerError = (state: RootState) => state.dataLayer.error
export const selectDataLayerReconnectAttempts = (state: RootState) => state.dataLayer.reconnectAttempts
export const selectDataLayerRemovingAsset = (state: RootState) => state.dataLayer.removingAsset

// Reducer
export default dataLayer.reducer
