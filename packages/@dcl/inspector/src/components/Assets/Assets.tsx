import React, { useCallback, useState } from 'react'
import cx from 'classnames'

import { AssetsTab } from './types'
import { FolderOpen } from '../Icons/Folder'
import { MdImageSearch } from 'react-icons/md'
import { HiOutlinePlus } from 'react-icons/hi'
import { useCatalog } from '../../hooks/catalog/useCatalog'
import { AssetsCatalog } from '../AssetsCatalog'
import { ProjectAssetExplorer } from '../ProjectAssetExplorer'
import ImportAsset from '../ImportAsset'

import './Assets.css'

function Assets() {
  const [catalog, catalogError, isCatalogLoading] = useCatalog()
  const [tab, setTab] = useState<AssetsTab>(AssetsTab.FileSystem)

  const handleTabClick = useCallback(
    (value: AssetsTab) => () => {
      setTab(value)
    },
    [tab]
  )
  return (
    <div className="Assets">
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
            <span>BUILDER ASSETS</span>
          </div>
        </div>
        <div onClick={handleTabClick(AssetsTab.Import)}>
          <div>
            <HiOutlinePlus />
          </div>
        </div>
      </div>
      <div className="Assets-content">
        {tab === AssetsTab.AssetsPack && (
          <AssetsCatalog catalog={catalog} error={catalogError} isLoading={isCatalogLoading} />
        )}
        {tab === AssetsTab.FileSystem && <ProjectAssetExplorer />}
        {tab === AssetsTab.Import && <ImportAsset onSave={handleTabClick(AssetsTab.FileSystem)} />}
      </div>
    </div>
  )
}

export default React.memo(Assets)
