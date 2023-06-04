import { DataLayerRpcClient } from '../../data-layer/remote-data-layer'
import { InspectorPreferences } from './types'

export class InspectorPreferencesManager {
  public readonly data: InspectorPreferences
  private dataLayer: DataLayerRpcClient

  constructor(preferences: InspectorPreferences, dataLayer: DataLayerRpcClient) {
    this.data = preferences
    this.dataLayer = dataLayer
  }

  setFreeCameraInvertRotation(invert: boolean) {
    this.data.freeCameraInvertRotation = invert
    void this.dataLayer.setInspectorPreferences(this.data)
  }
}
