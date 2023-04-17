import { AssetNodeFolder } from './types'

import { useFileSystem } from '../../hooks/catalog/useFileSystem'
import ProjectView from './ProjectView'
import { buildAssetTree } from './utils'

import './ProjectAssetExplorer.css'

export function ProjectAssetExplorer() {
  const { files } = useFileSystem()

  const tree = buildAssetTree(files.assets.map((item) => item.path))
  const folders = tree.children.filter((item) => item.type === 'folder') as AssetNodeFolder[]

  return <ProjectView folders={folders} />
}
