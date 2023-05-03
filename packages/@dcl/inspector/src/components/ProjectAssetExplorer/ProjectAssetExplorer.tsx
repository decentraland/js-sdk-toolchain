import { useAssetTree } from '../../hooks/catalog/useAssetTree'
import { useFileSystem } from '../../hooks/catalog/useFileSystem'
import ProjectView from './ProjectView'

import { AssetNodeFolder, PropTypes } from './types'

import './ProjectAssetExplorer.css'

export function ProjectAssetExplorer({ onImportAsset }: PropTypes) {
  const [files] = useFileSystem()
  const { tree } = useAssetTree(files)
  const folders = tree.children.filter((item) => item.type === 'folder') as AssetNodeFolder[]

  return <ProjectView folders={folders} onImportAsset={onImportAsset} />
}
