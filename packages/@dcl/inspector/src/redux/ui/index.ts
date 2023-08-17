import { PayloadAction, createSlice } from '@reduxjs/toolkit'
import { RootState } from '../store'
import { AssetsTab, PanelName } from './types'

export interface UiState {
  hiddenComponents: Record<string, boolean>
  hiddenPanels: Partial<Record<PanelName, boolean>>
  disableGizmos: boolean
  selectedAssetsTab: AssetsTab
}

export const initialState: UiState = {
  hiddenComponents: {},
  hiddenPanels: {},
  disableGizmos: false,
  selectedAssetsTab: AssetsTab.FileSystem
}

export const appState = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleComponent: (state, { payload }: PayloadAction<{ component: string; enabled: boolean }>) => {
      const { component, enabled } = payload
      state.hiddenComponents[component] = !enabled
    },
    togglePanel: (state, { payload }: PayloadAction<{ panel: PanelName; enabled: boolean }>) => {
      const { panel, enabled } = payload
      state.hiddenPanels[panel] = !enabled
    },
    toggleGizmos: (state, { payload }: PayloadAction<{ enabled: boolean }>) => {
      const { enabled } = payload
      state.disableGizmos = !enabled
    },
    selectAssetsTab: (state, { payload }: PayloadAction<{ tab: AssetsTab }>) => {
      const { tab } = payload
      state.selectedAssetsTab = tab
    }
  }
})

// Actions
export const { toggleComponent, togglePanel, selectAssetsTab } = appState.actions

// Selectors
export const getHiddenComponents = (state: RootState): Record<string, boolean> => state.ui.hiddenComponents
export const getHiddenPanels = (state: RootState): Partial<Record<PanelName, boolean>> => state.ui.hiddenPanels
export const getSelectedAssetsTab = (state: RootState) => state.ui.selectedAssetsTab
export const areGizmosDisabled = (state: RootState) => state.ui.disableGizmos

// Reducer
export default appState.reducer
