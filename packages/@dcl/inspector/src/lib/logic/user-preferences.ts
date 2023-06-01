import { DataLayerRpcClient, UserPreferences as UserPreferencesPb } from '../data-layer/remote-data-layer'

export type UserPreferences = {
  camera: {
    invertXAxis: boolean
    invertYAxis: boolean
  }
}

export class UserPreferencesManager {
  public readonly preferences: UserPreferences
  private dataLayer: DataLayerRpcClient

  constructor(preferences: UserPreferencesPb, dataLayer: DataLayerRpcClient) {
    this.preferences = {
      camera: preferences.camera ? preferences.camera : {invertXAxis: false, invertYAxis: false}
    }
    this.dataLayer = dataLayer
  }

  setCameraInvertXAxis(invert: boolean) {
    this.preferences.camera.invertXAxis = invert
    this.dataLayer.setUserPreferences(this.preferences)
  }

  setCameraInvertYAxis(invert: boolean) {
    this.preferences.camera.invertYAxis = invert
    this.dataLayer.setUserPreferences(this.preferences)
  }

}
