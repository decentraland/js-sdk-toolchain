import { IEngine } from '@dcl/ecs'
import { PayloadAction, createSlice } from '@reduxjs/toolkit'
import { RootState } from '../store'

export enum ErrorType {
  AncestorSelected = 'ancestor-selected'
}

export interface EngineState {
  inspectorEngine: IEngine | undefined
  rendererEngine: IEngine | undefined
  error: ErrorType | undefined
}

export const initialState: EngineState = {
  inspectorEngine: undefined,
  rendererEngine: undefined,
  error: undefined
}

export const sdkEngines = createSlice({
  name: 'sdk-engines',
  initialState,
  reducers: {
    addEngines: (state, { payload }: PayloadAction<{ inspector: IEngine; babylon: IEngine }>) => {
      state.inspectorEngine = payload.inspector
      state.rendererEngine = payload.babylon
    },
    error: (state, { payload }: PayloadAction<{ error: ErrorType }>) => {
      console.log('[SDK] Error', payload.error)
      state.error = payload.error
    },
    clearError: (state) => {
      state.error = undefined
    }
  }
})

// Actions
export const { addEngines, error, clearError } = sdkEngines.actions

// Selectors
export const selectEngines = (state: RootState) => ({
  inspector: state.sdk.inspectorEngine,
  renderer: state.sdk.rendererEngine
})
export const selectSdkOperationError = (state: RootState) => state.sdk.error

// Reducer
export default sdkEngines.reducer
