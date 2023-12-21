import { ComponentName } from '@dcl/asset-packs'
import { CoreComponents } from '../../lib/sdk/components'

export interface IAsset {
  src: string
  type: 'unknown' | 'gltf' | 'composite' | 'audio' | 'video'
  id?: string
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
  components?: Partial<Record<ComponentName | CoreComponents, any>>
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
