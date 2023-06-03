export type InspectorPreferences = {
  cameraInvertXAxis: boolean,
  cameraInvertYAxis: boolean,
  autosaveEnabled: boolean
}

export function getDefaultInspectorPreferences(): InspectorPreferences {
  return {
    cameraInvertXAxis: false,
    cameraInvertYAxis: false,
    autosaveEnabled: false
  }
}
