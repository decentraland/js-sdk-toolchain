import React, { useCallback } from 'react'
import cx from 'classnames'

import { FolderOpen } from '../Icons/Folder'
import { MdImageSearch } from 'react-icons/md'
import { HiOutlinePlus } from 'react-icons/hi'
import { AssetsCatalog } from '../AssetsCatalog'
import { catalog } from '../../lib/logic/catalog'
import { getSelectedAssetsTab, selectAssetsTab } from '../../redux/ui'
import { useAppDispatch, useAppSelector } from '../../redux/hooks'
import { AssetsTab } from '../../redux/ui/types'
import { ProjectAssetExplorer } from '../ProjectAssetExplorer'
import ImportAsset from '../ImportAsset'

import './Assets.css'

function Assets() {
  const dispatch = useAppDispatch()
  const tab = useAppSelector(getSelectedAssetsTab)

  const handleTabClick = useCallback(
    (tab: AssetsTab) => () => {
      dispatch(selectAssetsTab({ tab }))
    },
    []
  )

  return (
    <div className="Assets">
      <div className="Assets-buttons">
        <div className="tab" onClick={handleTabClick(AssetsTab.FileSystem)} data-test-id={AssetsTab.FileSystem}>
          <div className={cx({ underlined: tab === AssetsTab.FileSystem })}>
            <FolderOpen />
            <span>LOCAL ASSETS</span>
          </div>
        </div>
        <div className="tab" onClick={handleTabClick(AssetsTab.AssetsPack)} data-test-id={AssetsTab.AssetsPack}>
          <div className={cx({ underlined: tab === AssetsTab.AssetsPack })}>
            <MdImageSearch />
            <span>BUILDER ASSETS</span>
          </div>
        </div>
        <div className="tab" onClick={handleTabClick(AssetsTab.Import)} data-test-id={AssetsTab.Import}>
          <div>
            <HiOutlinePlus />
          </div>
        </div>
      </div>
      <div className="Assets-content">
        {tab === AssetsTab.AssetsPack && <AssetsCatalog catalog={catalog} />}
        {tab === AssetsTab.FileSystem && <ProjectAssetExplorer />}
        {tab === AssetsTab.Import && <ImportAsset onSave={handleTabClick(AssetsTab.FileSystem)} />}
      </div>
    </div>
  )
}

export default React.memo(Assets)
