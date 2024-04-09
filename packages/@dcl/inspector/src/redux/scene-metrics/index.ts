import { PayloadAction, createSlice } from '@reduxjs/toolkit'
import { RootState } from '../store'
import { SceneMetrics } from './types'

export interface SceneMetricsState {
  metrics: SceneMetrics
  limits: SceneMetrics
  entitiesOutOfBoundaries: number
}

export const initialState: SceneMetricsState = {
  metrics: {
    triangles: 0,
    entities: 0,
    bodies: 0,
    materials: 0,
    textures: 0
  },
  limits: {
    triangles: 0,
    entities: 0,
    bodies: 0,
    materials: 0,
    textures: 0
  },
  entitiesOutOfBoundaries: 0
}

export const sceneMetrics = createSlice({
  name: 'scene-metrics',
  initialState,
  reducers: {
    setMetrics: (state, { payload }: PayloadAction<SceneMetrics>) => {
      state.metrics = payload
    },
    setLimits(state, { payload }: PayloadAction<SceneMetrics>) {
      state.limits = payload
    },
    setEntitiesOutOfBoundaries: (state, { payload }: PayloadAction<number>) => {
      state.entitiesOutOfBoundaries = payload
    }
  }
})

// Actions
export const { setMetrics, setEntitiesOutOfBoundaries, setLimits } = sceneMetrics.actions

// Selectors
export const getMetrics = (state: RootState): SceneMetrics => state.sceneMetrics.metrics
export const getLimits = (state: RootState): SceneMetrics => state.sceneMetrics.limits
export const getEntitiesOutOfBoundaries = (state: RootState): number => state.sceneMetrics.entitiesOutOfBoundaries

// Reducer
export default sceneMetrics.reducer
