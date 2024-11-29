import { Identifier } from 'dnd-core'
import { Asset } from '../../lib/logic/catalog'
import { TreeNode } from '../../components/ProjectAssetExplorer/ProjectView'
import { AssetNodeItem } from '../../components/ProjectAssetExplorer/types'

interface Drop<T, K = object> {
  value: T
  context: K
}

export type LocalAssetDrop = Drop<string, { tree: Map<string, TreeNode> }>
export type CatalogAssetDrop = Drop<Asset>

export type IDrop = LocalAssetDrop | CatalogAssetDrop

export enum DropTypesEnum {
  ProjectAsset = 'local-asset',
  CatalogAsset = 'catalog-asset'
}

export type DropTypes = `${DropTypesEnum}`

export function isDropType<T extends IDrop>(_: IDrop, identifier: Identifier | null, type: DropTypes): _ is T {
  return identifier === type
}

export const DROP_TYPES = Object.values(DropTypesEnum)

export const getNode = (
  node: TreeNode,
  tree: Map<string, TreeNode>,
  isFn: (node: TreeNode) => node is AssetNodeItem
): AssetNodeItem | null => {
  if (isFn(node)) return node

  const children = node.children || []
  for (const child of children) {
    const childNode = tree.get(child)
    if (childNode && isFn(childNode)) return childNode
  }

  return null
}
