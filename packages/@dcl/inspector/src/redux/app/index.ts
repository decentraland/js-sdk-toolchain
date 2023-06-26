import { PayloadAction, createSlice } from '@reduxjs/toolkit'
import { RootState } from '../store'
import { InspectorPreferences } from '../../lib/logic/preferences/types'

export interface AppState {
  canSave: boolean
  preferences: InspectorPreferences | undefined
}

export const initialState: AppState = {
  // dirty engine
  canSave: false,
  preferences: undefined
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
    }
  }
})

export const { updateCanSave, updatePreferences } = appState.actions
export const getCanSave = (state: RootState): boolean => state.app.canSave
export const getInspectorPreferences = (state: RootState): InspectorPreferences | undefined => {
  return state.app.preferences
}

export default appState.reducer
