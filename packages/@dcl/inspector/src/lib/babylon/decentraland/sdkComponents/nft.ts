import { PBNftShape, ComponentType } from '@dcl/ecs'

import type { ComponentOperation } from '../component-operations'
import { updateGltfForEntity } from './gltf-container'
import { withAssetDir } from '../../../data-layer/host/fs-utils'

export const putNftShapeComponent: ComponentOperation = (entity, component) => {
  if (component.componentType === ComponentType.LastWriteWinElementSet) {
    const newValue = component.getOrNull(entity.entityId) as PBNftShape | null
    const gltfValue = newValue ? { src: withAssetDir('builder/nft/nft.glb') } : null
    updateGltfForEntity(entity, gltfValue)
  }
}
