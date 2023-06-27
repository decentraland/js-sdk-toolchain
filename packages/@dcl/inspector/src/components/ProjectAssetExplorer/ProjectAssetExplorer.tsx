import React from 'react'

import { useAssetTree } from '../../hooks/catalog/useAssetTree'
import ProjectView from './ProjectView'

import { AssetNodeFolder } from './types'

import './ProjectAssetExplorer.css'
import { useAppSelector } from '../../redux/hooks'
import { selectAssetCatalog } from '../../redux/app'

function ProjectAssetExplorer() {
  const files = useAppSelector(selectAssetCatalog)
  const { tree } = useAssetTree(files ?? { basePath: '', assets: [] })
  const folders = tree.children.filter((item) => item.type === 'folder') as AssetNodeFolder[]

  return <ProjectView folders={folders} />
}

export default React.memo(ProjectAssetExplorer)
