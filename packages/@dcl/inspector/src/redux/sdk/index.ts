import { IEngine } from '@dcl/ecs'
import { PayloadAction, createSlice } from '@reduxjs/toolkit'
import { RootState } from '../store'

export interface EngineState {
  inspectorEngine: IEngine | undefined
  rendererEngine: IEngine | undefined
}

export const initialState: EngineState = {
  inspectorEngine: undefined,
  rendererEngine: undefined
}

export const sdkEngines = createSlice({
  name: 'sdk-engines',
  initialState,
  reducers: {
    addEngines: (state, { payload }: PayloadAction<{ inspector: IEngine; babylon: IEngine }>) => {
      state.inspectorEngine = payload.inspector
      state.rendererEngine = payload.babylon
    }
  }
})

export const { addEngines } = sdkEngines.actions
export const getEngines = (state: RootState) => ({
  inspector: state.sdk.inspectorEngine,
  renderer: state.sdk.rendererEngine
})

export default sdkEngines.reducer
