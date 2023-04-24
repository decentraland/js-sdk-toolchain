import { PBGltfContainer } from '@dcl/ecs'

import { memoize } from '../../../lib/logic/once'
import { TreeNode } from '../../ProjectAssetExplorer/ProjectView'
import { isAssetNode } from '../../ProjectAssetExplorer/utils'
import { AssetNodeItem } from '../../ProjectAssetExplorer/types'
import { AssetCatalogResponse } from '../../../tooling-entrypoint'

export function fromGltf(value: PBGltfContainer) {
  return { src: value.src }
}

export const toGltf = fromGltf

export function isValidInput({ assets }: AssetCatalogResponse, src: string): boolean {
  return !!assets.find(($) => $.path === src)
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
