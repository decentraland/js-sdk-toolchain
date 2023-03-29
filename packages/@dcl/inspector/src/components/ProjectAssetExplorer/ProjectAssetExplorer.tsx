import { useState } from 'react'
import { useDrag } from 'react-dnd'

import { AssetCellProp, AssetNode, AssetNodeFolder, FolderCellProp, AssetNodeItem } from './types'

import { useSdk } from '../../hooks/sdk/useSdk'
import './ProjectAssetExplorer.css'
import { AssetNodeRootNull, buildAssetTree } from './utils'
import { useIsMounted } from '../../hooks/useIsMounted'

export function ProjectAssetExplorer() {
  const isMounted = useIsMounted()
  const [root, setRoot] = useState<AssetNode>(AssetNodeRootNull())
  const [selectedFolder, setSelectedFolder] = useState<AssetNodeFolder>(AssetNodeRootNull())

  const sdk = useSdk(async ({ dataLayer }) => {
    const assetcatalog = await dataLayer.getAssetCatalog({})
    if (!isMounted()) return

    const tree = buildAssetTree(assetcatalog.assets.map((item) => item.path))
    setRoot(tree)
    setSelectedFolder(tree)
  })

  function handleFolderClick(folder: AssetNodeFolder) {
    setSelectedFolder(folder)
  }

  const folders = selectedFolder.children.filter((item) => item.type === 'folder') as AssetNodeFolder[]
  const assets = selectedFolder.children.filter((item) => item.type === 'asset') as AssetNodeItem[]

  return (
    <div className="assets-catalog">
      <h1>{selectedFolder.name}</h1>
      {selectedFolder.parent && <FolderCell onClick={handleFolderClick} folder={selectedFolder.parent} back={true} />}
      {folders.map((folder) => (
        <FolderCell onClick={handleFolderClick} folder={folder} />
      ))}

      <div className="category">
        <div className="assets">
          {assets.map((item) => {
            if (item.asset.type === 'gltf') return <GltfAssetCell value={item} />
            return <UnknownAssetCell value={item} />
          })}
        </div>
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
    <div onClick={handleClick} className="theme">
      {/* <img src={''} alt={name} /> */}
      {back && '🔙'}
      <h4>{folder.name}</h4>
      <div></div>
    </div>
  )
}

function GltfAssetCell({ value }: AssetCellProp) {
  const [, drag] = useDrag(() => ({ type: 'project-asset-gltf', item: { asset: value } }), [value])

  return (
    <div ref={drag}>
      <img src={''} />
      <h4>{value.name}</h4>
      <div></div>
    </div>
  )
}
function UnknownAssetCell({ value }: AssetCellProp) {
  return (
    <div>
      <img src={''} />
      <h4>{value.name}</h4>
      <div></div>
    </div>
  )
}
