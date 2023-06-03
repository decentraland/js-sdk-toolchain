import { DataLayerRpcClient } from '../../data-layer/remote-data-layer'
import { InspectorPreferences } from './types'

export class InspectorPreferencesManager {
  public readonly data: InspectorPreferences
  private dataLayer: DataLayerRpcClient

  constructor(preferences: InspectorPreferences, dataLayer: DataLayerRpcClient) {
    this.data = preferences
    this.dataLayer = dataLayer
  }

  setCameraInvertXAxis(value: boolean) {
    this.data.cameraInvertXAxis = value
    this.dataLayer.setInspectorPreferences(this.data)
  }

  setCameraInvertYAxis(value: boolean) {
    this.data.cameraInvertYAxis = value
    this.dataLayer.setInspectorPreferences(this.data)
  }
}
