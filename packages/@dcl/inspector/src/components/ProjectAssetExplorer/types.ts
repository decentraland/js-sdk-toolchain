export interface PropTypes {
  onImportAsset(): void
}

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
