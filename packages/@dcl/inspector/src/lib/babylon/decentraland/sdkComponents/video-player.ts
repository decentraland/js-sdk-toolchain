import * as BABYLON from '@babylonjs/core'
import { PBVideoPlayer, ComponentType } from '@dcl/ecs'

import type { ComponentOperation } from '../component-operations'
import { updateGltfForEntity } from './gltf-container'
import { withAssetDir } from '../../../data-layer/host/fs-utils'

export const putVideoPlayerComponent: ComponentOperation = (entity, component) => {
  if (component.componentType === ComponentType.LastWriteWinElementSet) {
    const newValue = component.getOrNull(entity.entityId) as PBVideoPlayer | null
    const gltfValue = newValue ? { src: withAssetDir('builder/video_player/video_player.glb') } : null
    updateGltfForEntity(entity, gltfValue)
    const scaleMult = 1.55
    entity
      .onGltfContainerLoaded()
      .then(() => {
        if (entity.gltfAssetContainer) {
          // need to re-scale the model to get in sync with scale in preview...
          entity.gltfAssetContainer.meshes[0].scaling = new BABYLON.Vector3(
            // why negative X coordinate? => https://forum.babylonjs.com/t/left-and-right-handed-shenanagins/17049/4
            -0.2 * scaleMult,
            0.4 * scaleMult,
            0.1 * scaleMult
          )
          entity.gltfAssetContainer.meshes[0].position = new BABYLON.Vector3(0, -0.5, 0)
        }
      })
      .catch(() => {})
  }
}
