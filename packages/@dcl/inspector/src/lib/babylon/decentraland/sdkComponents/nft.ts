import * as BABYLON from '@babylonjs/core'
import { PBNftShape, ComponentType } from '@dcl/ecs'

import type { ComponentOperation } from '../component-operations'
import { updateGltfForEntity } from './gltf-container'
import { withAssetDir } from '../../../data-layer/host/fs-utils'

export const putNftShapeComponent: ComponentOperation = (entity, component) => {
  if (component.componentType === ComponentType.LastWriteWinElementSet) {
    const newValue = component.getOrNull(entity.entityId) as PBNftShape | null
    const gltfValue = newValue ? { src: withAssetDir('builder/nft/nft.glb') } : null
    updateGltfForEntity(entity, gltfValue)
    entity
      .onGltfContainerLoaded()
      .then(() => {
        if (entity.gltfAssetContainer) {
          // need to re-scale the model to get in sync with scale in preview...
          entity.gltfAssetContainer.meshes[0].scaling = new BABYLON.Vector3(1, 1, 0.1)
          entity.gltfAssetContainer.meshes[0].position = new BABYLON.Vector3(0, -0.25, 0)
        }
      })
      .catch(() => {})
  }
}
