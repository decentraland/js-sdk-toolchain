import { AssetData } from '@dcl/asset-packs'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { Entity } from '@dcl/ecs'
import { RootState } from '../../redux/store'
import { DataLayerRpcClient } from '../../lib/data-layer/types'
import { InspectorPreferences } from '../../lib/logic/preferences/types'
import { Asset, ImportAssetRequest, SaveFileRequest } from '../../lib/data-layer/remote-data-layer'
import { AssetsTab } from '../ui/types'

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
  GetThumbnails = 'get-thumbnails',
  CreateCustomAsset = 'create-custom-asset',
  DeleteCustomAsset = 'delete-custom-asset',
  RenameCustomAsset = 'rename-custom-asset'
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
  reloadAssets: string[]
  assetToRename: { id: string; name: string } | undefined
  stagedCustomAsset: { entities: Entity[]; previousTab: AssetsTab; initialName: string } | undefined
}

export const initialState: DataLayerState = {
  reconnectAttempts: 0,
  error: undefined,
  removingAsset: {},
  reloadAssets: [],
  assetToRename: undefined,
  stagedCustomAsset: undefined
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
    importAsset: (state, payload: PayloadAction<ImportAssetRequest & { reload?: boolean }>) => {
      const { reload, ...importAssetRequest } = payload.payload
      state.reloadAssets = reload ? Array.from(importAssetRequest.content.keys()) : []
    },
    removeAsset: (state, payload: PayloadAction<Asset>) => {
      state.removingAsset[payload.payload.path] = true
    },
    clearRemoveAsset: (state, payload: PayloadAction<Asset>) => {
      delete state.removingAsset[payload.payload.path]
    },
    saveThumbnail: (_state, _payload: PayloadAction<SaveFileRequest>) => {},
    getThumbnails: () => {},
    createCustomAsset: (
      _state,
      _payload: PayloadAction<{
        name: string
        composite: AssetData['composite']
        resources: string[]
        thumbnail?: string
      }>
    ) => {},
    deleteCustomAsset: (_state, _payload: PayloadAction<{ assetId: string }>) => {},
    renameCustomAsset: (state, _payload: PayloadAction<{ assetId: string; newName: string }>) => {
      state.assetToRename = undefined
    },
    setAssetToRename: (state, payload: PayloadAction<{ assetId: string; name: string }>) => {
      state.assetToRename = { id: payload.payload.assetId, name: payload.payload.name }
    },
    clearAssetToRename: (state) => {
      state.assetToRename = undefined
    },
    stageCustomAsset: (
      state,
      payload: PayloadAction<{ entities: Entity[]; previousTab: AssetsTab; initialName: string }>
    ) => {
      state.stagedCustomAsset = payload.payload
    },
    clearStagedCustomAsset: (state) => {
      state.stagedCustomAsset = undefined
    }
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
  getThumbnails,
  createCustomAsset,
  deleteCustomAsset,
  renameCustomAsset,
  setAssetToRename,
  clearAssetToRename,
  stageCustomAsset,
  clearStagedCustomAsset
} = dataLayer.actions

// Selectors
export const selectDataLayerError = (state: RootState) => state.dataLayer.error
export const selectDataLayerReconnectAttempts = (state: RootState) => state.dataLayer.reconnectAttempts
export const selectDataLayerRemovingAsset = (state: RootState) => state.dataLayer.removingAsset
export const getReloadAssets = (state: RootState) => state.dataLayer.reloadAssets
export const selectAssetToRename = (state: RootState) => state.dataLayer.assetToRename
export const selectStagedCustomAsset = (state: RootState) => state.dataLayer.stagedCustomAsset

// Reducer
export default dataLayer.reducer
