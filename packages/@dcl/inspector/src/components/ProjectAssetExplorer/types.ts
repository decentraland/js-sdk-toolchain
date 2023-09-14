import { ComponentName } from '@dcl/asset-packs'

export interface IAsset {
  src: string
  type: 'unknown' | 'gltf' | 'composite'
  thumbnail?: string
}

export interface FolderCellProp {
  back?: boolean
  onClick: (item: AssetNodeFolder) => void
  folder: AssetNodeFolder
}

export interface AssetCellProp {
  value: AssetNodeItem
}

export type AssetNodeBase = {
  name: string
  parent: AssetNodeFolder | null
  components?: Partial<Record<ComponentName, any>>
}

export type AssetNodeItem = AssetNodeBase & {
  type: 'asset'
  asset: IAsset
}

export type AssetNodeFolder = AssetNodeBase & {
  type: 'folder'
  children: AssetNode[]
}

export type AssetNode = AssetNodeItem | AssetNodeFolder
