import { ColliderLayer, PBGltfContainer } from '@dcl/ecs'

import { memoize } from '../../../lib/logic/once'
import { TreeNode } from '../../ProjectAssetExplorer/ProjectView'
import { isAssetNode } from '../../ProjectAssetExplorer/utils'
import { AssetNodeItem } from '../../ProjectAssetExplorer/types'
import { AssetCatalogResponse } from '../../../tooling-entrypoint'
import { removeBasePath } from '../../../lib/logic/remove-base-path'
import { GltfContainerInput } from './types'

const toNumber = (value: string, def?: ColliderLayer) => {
  const num = Number(value)
  return isNaN(num) ? def : num
}

const toString = (value: unknown, def: number = 0) => (value ?? def).toString()

export const fromGltf = (base: string) => (value: PBGltfContainer): GltfContainerInput => {
  return {
    src: removeBasePath(base, value.src),
    visibleMeshesCollisionMask: toString(value.visibleMeshesCollisionMask, ColliderLayer.CL_NONE),
    invisibleMeshesCollisionMask: toString(value.invisibleMeshesCollisionMask, ColliderLayer.CL_PHYSICS)
  }
}

export const toGltf = (base: string) => (value: GltfContainerInput): PBGltfContainer => {
  return {
    src: base ? base + '/' + value.src : value.src,
    visibleMeshesCollisionMask: toNumber(value.visibleMeshesCollisionMask, ColliderLayer.CL_NONE),
    invisibleMeshesCollisionMask: toNumber(value.invisibleMeshesCollisionMask, ColliderLayer.CL_PHYSICS)
  }
}

export function isValidInput({ basePath, assets }: AssetCatalogResponse, src: string): boolean {
  return !!assets.find(($) => (basePath ? basePath + '/' + src : src) === $.path)
}

export const isAsset = (value: string): boolean => value.endsWith('.gltf') || value.endsWith('.glb')

export const isModel = (node: TreeNode): node is AssetNodeItem => isAssetNode(node) && isAsset(node.name)

export const getModel = memoize((node: TreeNode, tree: Map<string, TreeNode>): AssetNodeItem | null => {
  if (isModel(node)) return node

  const children = node.children || []
  for (const child of children) {
    const childNode = tree.get(child)
    if (childNode && isModel(childNode)) return childNode
  }

  return null
})

export const COLLISION_LAYERS = [{
  value: ColliderLayer.CL_NONE,
  label: 'None'
}, {
  value: ColliderLayer.CL_POINTER,
  label: 'Pointer'
}, {
  value: ColliderLayer.CL_PHYSICS,
  label: 'Physics'
}, {
  value: ColliderLayer.CL_CUSTOM1,
  label: 'Custom 1'
}, {
  value: ColliderLayer.CL_CUSTOM2,
  label: 'Custom 2'
}, {
  value: ColliderLayer.CL_CUSTOM3,
  label: 'Custom 3'
}, {
  value: ColliderLayer.CL_CUSTOM4,
  label: 'Custom 4'
}, {
  value: ColliderLayer.CL_CUSTOM5,
  label: 'Custom 5'
}, {
  value: ColliderLayer.CL_CUSTOM6,
  label: 'Custom 6'
}, {
  value: ColliderLayer.CL_CUSTOM7,
  label: 'Custom 7'
}, {
  value: ColliderLayer.CL_CUSTOM8,
  label: 'Custom 8'
}]
