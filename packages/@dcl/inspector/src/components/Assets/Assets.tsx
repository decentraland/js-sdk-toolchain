import React, { useCallback, useRef } from 'react'
import cx from 'classnames'
import { MdImageSearch } from 'react-icons/md'
import { HiOutlinePlus } from 'react-icons/hi'

import { AssetPack, catalog, isSmart } from '../../lib/logic/catalog'
import { getConfig } from '../../lib/logic/config'
import { useAppDispatch, useAppSelector } from '../../redux/hooks'
import { selectAssetToRename, selectStagedCustomAsset } from '../../redux/data-layer'
import { getSelectedAssetsTab, selectAssetsTab } from '../../redux/ui'
import { AssetsTab } from '../../redux/ui/types'
import { FolderOpen } from '../Icons/Folder'
import { AssetsCatalog } from '../AssetsCatalog'
import { ProjectAssetExplorer } from '../ProjectAssetExplorer'
import ImportAsset from '../ImportAsset'
import { CustomAssets } from '../CustomAssets'
import { selectCustomAssets } from '../../redux/app'
import { RenameAsset } from '../RenameAsset'
import { CreateCustomAsset } from '../CreateCustomAsset'
import { InputRef } from '../FileInput/FileInput'
import { Button } from '../Button'

import './Assets.css'

function removeSmartItems(assetPack: AssetPack) {
  return {
    ...assetPack,
    assets: assetPack.assets.filter((asset) => !isSmart(asset))
  }
}

function Assets({ isAssetsPanelCollapsed }: { isAssetsPanelCollapsed: boolean }) {
  const dispatch = useAppDispatch()
  const tab = useAppSelector(getSelectedAssetsTab)
  const customAssets = useAppSelector(selectCustomAssets)
  const inputRef = useRef<InputRef>(null)

  const handleTabClick = useCallback(
    (tab: AssetsTab) => () => {
      dispatch(selectAssetsTab({ tab }))
    },
    []
  )

  const config = getConfig()
  const filteredCatalog = config.disableSmartItems
    ? catalog.map(removeSmartItems).filter((assetPack) => assetPack.assets.length > 0)
    : catalog

  const assetToRename = useAppSelector(selectAssetToRename)
  const stagedCustomAsset = useAppSelector(selectStagedCustomAsset)

  const handleImportClick = useCallback(() => {
    inputRef.current?.onClick()
  }, [inputRef])

  return (
    <div className="Assets">
      <div className="Assets-buttons">
        <Button onClick={handleImportClick}>
          <HiOutlinePlus />
          IMPORT ASSETS
        </Button>
        <div className="tab" onClick={handleTabClick(AssetsTab.FileSystem)} data-test-id={AssetsTab.FileSystem}>
          <div className={cx({ underlined: tab === AssetsTab.FileSystem })}>
            <FolderOpen />
            <span>LOCAL ASSETS</span>
          </div>
        </div>
        {customAssets.length > 0 ? (
          <div className="tab" onClick={handleTabClick(AssetsTab.CustomAssets)} data-test-id={AssetsTab.CustomAssets}>
            <div className={cx({ underlined: tab === AssetsTab.CustomAssets })}>
              <i className="icon-custom-assets" />
              <span>CUSTOM ITEMS</span>
            </div>
          </div>
        ) : null}
        <div className="tab" onClick={handleTabClick(AssetsTab.AssetsPack)} data-test-id={AssetsTab.AssetsPack}>
          <div className={cx({ underlined: tab === AssetsTab.AssetsPack })}>
            <MdImageSearch />
            <span>ASSET PACKS</span>
          </div>
        </div>
      </div>
      <ImportAsset onSave={handleTabClick(AssetsTab.FileSystem)} ref={inputRef}>
        <div className={cx('Assets-content', { Hide: isAssetsPanelCollapsed })}>
          {tab === AssetsTab.AssetsPack && <AssetsCatalog catalog={filteredCatalog} />}
          {tab === AssetsTab.FileSystem && <ProjectAssetExplorer />}
          {tab === AssetsTab.CustomAssets && <CustomAssets />}
          {tab === AssetsTab.RenameAsset && assetToRename && (
            <RenameAsset assetId={assetToRename.id} currentName={assetToRename.name} />
          )}
          {tab === AssetsTab.CreateCustomAsset && stagedCustomAsset && <CreateCustomAsset />}
        </div>
      </ImportAsset>
    </div>
  )
}

export default React.memo(Assets)
