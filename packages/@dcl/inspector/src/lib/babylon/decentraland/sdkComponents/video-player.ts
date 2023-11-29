import { PBVideoPlayer, ComponentType } from '@dcl/ecs'

import type { ComponentOperation } from '../component-operations'
import { updateGltfForEntity } from './gltf-container'
import { withAssetDir } from '../../../data-layer/host/fs-utils'

export const putVideoPlayerComponent: ComponentOperation = (entity, component) => {
  if (component.componentType === ComponentType.LastWriteWinElementSet) {
    const newValue = component.getOrNull(entity.entityId) as PBVideoPlayer | null
    const gltfValue = newValue ? { src: withAssetDir('builder/video_player/video_player.glb') } : null
    updateGltfForEntity(entity, gltfValue)
  }
}
