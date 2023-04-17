/* eslint-disable no-console */
import React, { useState } from 'react'

import { AssetNode, AssetNodeFolder } from './types'

import { useSdk } from '../../hooks/sdk/useSdk'
import { useIsMounted } from '../../hooks/useIsMounted'
import { DataLayerRpcClient } from '../../tooling-entrypoint'
import { AssetNodeRootNull, buildAssetTree } from './utils'

import './ProjectAssetExplorer.css'
import ProjectView from './ProjectView'

export function ProjectAssetExplorer() {
  const isMounted = useIsMounted()
  const [_root, setRoot] = useState<AssetNode>(AssetNodeRootNull())
  const [selectedFolder, setSelectedFolder] = useState<AssetNodeFolder>(AssetNodeRootNull())

  const updateAssetCatalog = async (dataLayer: DataLayerRpcClient) => {
    const assetcatalog = await dataLayer.getAssetCatalog({})
    if (!isMounted()) return

    const tree = buildAssetTree(assetcatalog.assets.map((item) => item.path))
    setRoot(tree)
    setSelectedFolder(tree)
  }

  useSdk(async ({ dataLayer }) => {
    await updateAssetCatalog(dataLayer)
  })

  const folders = selectedFolder.children.filter((item) => item.type === 'folder') as AssetNodeFolder[]

  return <ProjectView folders={folders} />
}
