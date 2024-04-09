export type InspectorPreferences = {
  freeCameraInvertRotation: boolean
  autosaveEnabled: boolean
}

export function getDefaultInspectorPreferences(): InspectorPreferences {
  return {
    freeCameraInvertRotation: false,
    autosaveEnabled: true
  }
}
