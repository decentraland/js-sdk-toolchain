import { PayloadAction, createSlice } from '@reduxjs/toolkit'
import { RootState } from '../store'
import { AssetsTab, PanelName, SceneInspectorTab } from './types'

export interface UiState {
  hiddenComponents: Record<string, boolean>
  hiddenPanels: Partial<Record<PanelName, boolean>>
  disableGizmos: boolean
  disableGroundGrid: boolean
  selectedAssetsTab: AssetsTab
  selectedSceneInspectorTab: SceneInspectorTab
  hiddenSceneInspectorTabs: Partial<Record<SceneInspectorTab, boolean>>
}

export const initialState: UiState = {
  hiddenComponents: {},
  hiddenPanels: {},
  disableGizmos: false,
  disableGroundGrid: false,
  selectedAssetsTab: AssetsTab.FileSystem,
  selectedSceneInspectorTab: SceneInspectorTab.DETAILS,
  hiddenSceneInspectorTabs: {}
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
    toggleGroundGrid: (state, { payload }: PayloadAction<{ enabled: boolean }>) => {
      const { enabled } = payload
      state.disableGroundGrid = !enabled
    },
    selectAssetsTab: (state, { payload }: PayloadAction<{ tab: AssetsTab }>) => {
      const { tab } = payload
      state.selectedAssetsTab = tab
    },
    selectSceneInspectorTab: (state, { payload }: PayloadAction<{ tab: SceneInspectorTab }>) => {
      const { tab } = payload
      state.selectedSceneInspectorTab = tab
    },
    toggleSceneInspectorTab: (state, { payload }: PayloadAction<{ tab: SceneInspectorTab; enabled: boolean }>) => {
      const { tab, enabled } = payload
      state.hiddenSceneInspectorTabs[tab] = !enabled
    }
  }
})

// Actions
export const {
  toggleComponent,
  togglePanel,
  toggleGizmos,
  toggleGroundGrid,
  selectAssetsTab,
  selectSceneInspectorTab,
  toggleSceneInspectorTab
} = appState.actions

// Selectors
export const getHiddenComponents = (state: RootState): Record<string, boolean> => state.ui.hiddenComponents
export const getHiddenPanels = (state: RootState): Partial<Record<PanelName, boolean>> => state.ui.hiddenPanels
export const getSelectedAssetsTab = (state: RootState) => state.ui.selectedAssetsTab
export const getSelectedSceneInspectorTab = (state: RootState) => state.ui.selectedSceneInspectorTab
export const getHiddenSceneInspectorTabs = (state: RootState) => state.ui.hiddenSceneInspectorTabs
export const areGizmosDisabled = (state: RootState) => state.ui.disableGizmos
export const isGroundGridDisabled = (state: RootState) => state.ui.disableGroundGrid

// Reducer
export default appState.reducer
