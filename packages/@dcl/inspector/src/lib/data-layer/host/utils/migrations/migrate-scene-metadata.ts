import { IEngine } from '@dcl/ecs'

import { EditorComponents } from '../../../../sdk/components'
import {
  removeOldSceneVersions,
  VERSIONS,
  getLatestSceneComponentVersion
} from '../../../../sdk/components/SceneMetadata'

/**
 * Retrieves the latest version of the Scene component from the engine.
 *
 * This function iterates through the list of known Scene component versions in reverse order,
 * attempting to find the latest version that is present in the engine.
 *
 * @param engine - The engine instance to query for the Scene component.
 * @returns An object containing the latest Scene component and its value, or null if no version is found.
 */
export function getCompositeLatestSceneComponent(engine: IEngine) {
  let component = null

  // Iterate in reverse order to find the latest component version
  for (let i = VERSIONS.length - 1; i >= 0; i--) {
    const name = VERSIONS[i].key
    const Scene = engine.getComponentOrNull(name) as EditorComponents['Scene'] | null

    if (Scene) {
      const scene = Scene.getMutableOrNull(engine.RootEntity)
      if (scene) {
        component = {
          component: Scene,
          value: scene
        }
        break
      }
    }
  }

  return component
}

export function migrateSceneMetadata(engine: IEngine) {
  const latestComponent = getCompositeLatestSceneComponent(engine)

  if (!latestComponent) return

  const { component, value } = latestComponent

  const latestComponentVersion = getLatestSceneComponentVersion()
  const isRunningLatestVersion = component.componentName === latestComponentVersion.key

  if (isRunningLatestVersion) return
  const oldComponent = component

  oldComponent.deleteFrom(engine.RootEntity)
  removeOldSceneVersions(engine, latestComponentVersion.key)

  const SceneMetadata = engine.getComponent(latestComponentVersion.key) as EditorComponents['Scene']
  SceneMetadata.createOrReplace(engine.RootEntity, value)
}
