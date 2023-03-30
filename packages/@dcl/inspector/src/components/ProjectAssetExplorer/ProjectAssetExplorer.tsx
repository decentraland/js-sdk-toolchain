import { useState } from 'react'
import { useDrag, useDrop } from 'react-dnd'

import { AssetCellProp, AssetNode, AssetNodeFolder, AssetNodeItem, FolderCellProp } from './types'

import React from 'react'
import { useSdk } from '../../hooks/sdk/useSdk'
import { useIsMounted } from '../../hooks/useIsMounted'
import { DataLayerRpcClient } from '../../tooling-entrypoint'
import { IAsset } from '../AssetsCatalog/types'
import './ProjectAssetExplorer.css'
import { AssetNodeRootNull, buildAssetTree, getFullNodePath } from './utils'

export function ProjectAssetExplorer() {
  const isMounted = useIsMounted()
  const [root, setRoot] = useState<AssetNode>(AssetNodeRootNull())
  const [selectedFolder, setSelectedFolder] = useState<AssetNodeFolder>(AssetNodeRootNull())
  const assetsExplorerRef = React.useRef<HTMLDivElement>(null)

  const updateAssetCatalog = async (dataLayer: DataLayerRpcClient) => {
    const assetcatalog = await dataLayer.getAssetCatalog({})
    if (!isMounted()) return

    const tree = buildAssetTree(assetcatalog.assets.map((item) => item.path))
    setRoot(tree)
    setSelectedFolder(tree)
  }

  const sdk = useSdk(async ({ dataLayer }) => {
    await updateAssetCatalog(dataLayer)
  })

  function handleFolderClick(folder: AssetNodeFolder) {
    setSelectedFolder(folder)
  }

  const folders = selectedFolder.children.filter((item) => item.type === 'folder') as AssetNodeFolder[]
  const assets = selectedFolder.children.filter((item) => item.type === 'asset') as AssetNodeItem[]
  const currentFolderName = selectedFolder === root ? 'root' : selectedFolder.name

  const importBuilderAsset = async (asset: IAsset) => {
    const fileContent: Record<string, Uint8Array> = {}
    await Promise.all(
      Object.entries(asset.contents).map(async ([path, contentHash]) => {
        try {
          const url = `https://builder-api.decentraland.org/v1/storage/contents/${contentHash}`
          const content = await (await fetch(url)).arrayBuffer()
          fileContent[path] = new Uint8Array(content)
        } catch (err) {
          console.error('Error fetching an asset import ' + path)
        }
      })
    )

    const destFolder = getFullNodePath(selectedFolder)

    if (!sdk) return null

    await sdk.dataLayer.importAsset({
      content: new Map(Object.entries(fileContent)),
      basePath: destFolder,
      assetPackageName: asset.name.trim().replaceAll(' ', '_').toLowerCase()
    })

    if (sdk) {
      await updateAssetCatalog(sdk.dataLayer)
    }

    console.log('importing into ', destFolder, asset, fileContent)
  }

  const [, drop] = useDrop(
    () => ({
      accept: ['builder-asset'],
      drop: ({ asset }: { asset: IAsset }, monitor) => {
        if (monitor.didDrop()) return
        void importBuilderAsset(asset)
      }
    }),
    [importBuilderAsset]
  )

  drop(assetsExplorerRef)

  return (
    <div className="asset-explorer-container">
      <div className="asset-explorer-left">
        <div className="asset-explorer-top">
          <h3>Current: {currentFolderName}</h3>
          <div className="asset-explorer-scrollable">
            {selectedFolder.parent && (
              <FolderCell key={'back'} onClick={handleFolderClick} folder={selectedFolder.parent} back={true} />
            )}
            {folders.map((folder, index) => (
              <FolderCell key={index} onClick={handleFolderClick} folder={folder} />
            ))}
          </div>
        </div>
        <div className="asset-explorer-bottom">
          <h2>Project Explorer</h2>
        </div>
      </div>
      <div ref={assetsExplorerRef} className="asset-explorer-right">
        <h2>Assets</h2>
        <ul className="asset-explorer-list">
          {assets.map((item, index) => {
            if (item.asset.type === 'gltf') return <GltfAssetCell key={index} value={item} />
            return <UnknownAssetCell key={index} value={item} />
          })}
        </ul>
      </div>
    </div>
  )
}

function FolderCell({ folder, onClick, back }: FolderCellProp) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClick(folder)
  }

  return (
    <div onClick={handleClick} className="asset-explorer-item">
      {back ? (
        '🔙 Back'
      ) : (
        <>
          <span>{`🗀 ${folder.name}`}</span>
        </>
      )}
    </div>
  )
}

function GltfAssetCell({ value }: AssetCellProp) {
  const [, drag] = useDrag(() => ({ type: 'project-asset-gltf', item: { asset: value } }), [value])

  return <li className="asset-explorer-item" ref={drag}>{`🖺 ${value.name}`}</li>
}

function UnknownAssetCell({ value }: AssetCellProp) {
  return <li className="asset-explorer-item">{`🖹 ${value.name}`}</li>
}
