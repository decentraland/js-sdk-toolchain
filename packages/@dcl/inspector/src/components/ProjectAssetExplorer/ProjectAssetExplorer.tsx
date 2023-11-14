import React from 'react'

import { useAssetTree } from '../../hooks/catalog/useAssetTree'
import ProjectView from './ProjectView'

import { AssetNodeFolder } from './types'

import './ProjectAssetExplorer.css'
import { useAppSelector } from '../../redux/hooks'
import { selectAssetCatalog, selectThumbnails } from '../../redux/app'

function ProjectAssetExplorer() {
  const files = useAppSelector(selectAssetCatalog) ?? { basePath: '', assets: [] }
  const thumbnails = useAppSelector(selectThumbnails)
  const { tree } = useAssetTree(files)
  const folders = tree.children.filter((item) => item.type === 'folder') as AssetNodeFolder[]

  return <ProjectView folders={folders} thumbnails={thumbnails} />
}

export default React.memo(ProjectAssetExplorer)
