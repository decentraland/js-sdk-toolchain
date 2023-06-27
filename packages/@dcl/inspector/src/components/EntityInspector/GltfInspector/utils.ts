import { PBGltfContainer } from '@dcl/ecs'

import { memoize } from '../../../lib/logic/once'
import { TreeNode } from '../../ProjectAssetExplorer/ProjectView'
import { isAssetNode } from '../../ProjectAssetExplorer/utils'
import { AssetNodeItem } from '../../ProjectAssetExplorer/types'
import { AssetCatalogResponse } from '../../../tooling-entrypoint'
import { removeBasePath } from '../../../lib/logic/remove-base-path'

export const fromGltf = (base: string) => (value: PBGltfContainer) => {
  return { src: removeBasePath(base, value.src) }
}

export const toGltf = (base: string) => (value: PBGltfContainer) => {
  return { src: base ? base + '/' + value.src : value.src }
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
