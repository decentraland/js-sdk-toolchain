import { PayloadAction, createSlice } from '@reduxjs/toolkit'
import { RootState } from '../store'
import { InspectorPreferences } from '../../lib/logic/preferences/types'
import { AssetCatalogResponse, GetFilesResponse } from '../../lib/data-layer/remote-data-layer'

export interface AppState {
  canSave: boolean
  preferences: InspectorPreferences | undefined
  assetsCatalog: AssetCatalogResponse | undefined
  thumbnails: GetFilesResponse['files']
  uploadFile: Record<string, File | string | undefined>
}

export const initialState: AppState = {
  // dirty engine
  canSave: false,
  preferences: undefined,
  assetsCatalog: undefined,
  thumbnails: [],
  uploadFile: {}
}

export const appState = createSlice({
  name: 'app-state',
  initialState,
  reducers: {
    updateCanSave: (state, { payload }: PayloadAction<{ dirty: boolean }>) => {
      // TODO: this should check for autoSaveEnabled: !sdk?.preferences.data.autosaveEnabled
      const isDirty = !state.preferences?.autosaveEnabled && payload.dirty
      state.canSave = isDirty
    },
    updatePreferences: (state, { payload }: PayloadAction<{ preferences: InspectorPreferences }>) => {
      state.preferences = payload.preferences
    },
    updateAssetCatalog: (state, { payload }: PayloadAction<{ assets: AssetCatalogResponse }>) => {
      state.assetsCatalog = payload.assets
    },
    updateThumbnails: (state, { payload }: PayloadAction<GetFilesResponse>) => {
      state.thumbnails = payload.files
    },
    updateUploadFile: (state, { payload }: PayloadAction<AppState['uploadFile']>) => {
      state.uploadFile = payload
    }
  }
})

// Actions
export const { updateCanSave, updatePreferences, updateAssetCatalog, updateThumbnails, updateUploadFile } =
  appState.actions

// Selectors
export const selectCanSave = (state: RootState): boolean => state.app.canSave
export const selectInspectorPreferences = (state: RootState): InspectorPreferences | undefined => {
  return state.app.preferences
}
export const selectAssetCatalog = (state: RootState) => state.app.assetsCatalog
export const selectThumbnails = (state: RootState) => state.app.thumbnails
export const selectUploadFile = (state: RootState) => state.app.uploadFile

// Reducer
export default appState.reducer
