import { Identifier } from 'dnd-core'

import { IAsset } from '../../components/AssetsCatalog/types'
import { TreeNode } from '../../components/ProjectAssetExplorer/ProjectView'

interface Drop<T, K = object> {
  value: T
  context: K
}

export type ProjectAssetDrop = Drop<string, { tree: Map<string, TreeNode> }>
export type BuilderAsset = Drop<IAsset>

export type IDrop = ProjectAssetDrop | BuilderAsset

enum DropTypesEnum {
  ProjectAsset = 'project-asset-gltf',
  BuilderAsset = 'builder-asset'
}

export type DropTypes = `${DropTypesEnum}`

export function isDropType<T extends IDrop>(_: IDrop, identifier: Identifier | null, type: DropTypes): _ is T {
  return identifier === type
}

export const DROP_TYPES = Object.values(DropTypesEnum)
