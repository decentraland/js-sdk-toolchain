import { TreeNode } from '../../../ProjectAssetExplorer/ProjectView'
import { AssetNodeItem } from '../../../ProjectAssetExplorer/types'
import { isAssetNode } from '../../../ProjectAssetExplorer/utils'

export const isAsset = (value: string): boolean => value.endsWith('.gltf') || value.endsWith('.glb')
export const isModel = (node: TreeNode): node is AssetNodeItem => isAssetNode(node) && isAsset(node.name)
