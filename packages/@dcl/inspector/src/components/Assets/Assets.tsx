import React, { useCallback, useState } from 'react'
import cx from 'classnames'

import { AssetsTab } from './types'
import { Box } from '../Box'
import { FolderOpen } from '../Icons/Folder'
import { MdImageSearch } from 'react-icons/md'
import { HiOutlinePlus } from 'react-icons/hi'
import { fileSystemEvent } from '../../hooks/catalog/useFileSystem'
import { AssetsCatalog } from '../AssetsCatalog'
import { ProjectAssetExplorer } from '../ProjectAssetExplorer'
import ImportAsset from '../ImportAsset'

import './Assets.css'

function Assets() {
  const [tab, setTab] = useState<AssetsTab | undefined>(undefined)

  const handleTabClick = useCallback(
    (value: AssetsTab) => () => {
      setTab(tab === value ? undefined : value)
    },
    [tab]
  )

  const handleSave = useCallback(() => {
    setTab(AssetsTab.FileSystem)
    fileSystemEvent.emit('change')
  }, [])

  return (
    <Box className="Assets">
      <div className="Assets-buttons">
        <div onClick={handleTabClick(AssetsTab.FileSystem)}>
          <div className={cx({ underlined: tab === AssetsTab.FileSystem })}>
            <FolderOpen />
            <span>LOCAL ASSETS</span>
          </div>
        </div>
        <div onClick={handleTabClick(AssetsTab.AssetsPack)}>
          <div className={cx({ underlined: tab === AssetsTab.AssetsPack })}>
            <MdImageSearch />
            <span>ASSETS PACKS</span>
          </div>
        </div>
        <div onClick={handleTabClick(AssetsTab.Import)}>
          <div>
            <HiOutlinePlus />
          </div>
        </div>
      </div>
      {tab && (
        <div className="Assets-content">
          {tab === AssetsTab.AssetsPack && <AssetsCatalog />}
          {tab === AssetsTab.FileSystem && <ProjectAssetExplorer onImportAsset={handleTabClick(AssetsTab.Import)} />}
          {tab === AssetsTab.Import && <ImportAsset onSave={handleSave} />}
        </div>
      )}
    </Box>
  )
}

export default React.memo(Assets)
