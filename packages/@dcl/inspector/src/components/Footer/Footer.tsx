import React, { useCallback, useState } from 'react'
import cx from 'classnames'

import { FooterTab } from './types'
import { Box } from '../Box'
import { FolderOpen } from '../Icons/Folder'
import { MdImageSearch } from 'react-icons/md'
import { HiOutlinePlus } from 'react-icons/hi'
import { useCatalog } from '../../hooks/catalog/useCatalog'
import { fileSystemEvent } from '../../hooks/catalog/useFileSystem'
import { AssetsCatalog } from '../AssetsCatalog'
import { ProjectAssetExplorer } from '../ProjectAssetExplorer'
import ImportAsset from '../ImportAsset'

import './Footer.css'

function Footer() {
  const [catalog] = useCatalog()
  const [tab, setTab] = useState<FooterTab | undefined>(undefined)

  const handleTabClick = useCallback(
    (value: FooterTab) => () => {
      setTab(tab === value ? undefined : value)
    },
    [tab]
  )

  const handleSave = useCallback(() => {
    setTab(FooterTab.FileSystem)
    fileSystemEvent.emit('change')
  }, [])

  return (
    <Box className="Footer">
      <div className="Footer-buttons">
        <div onClick={handleTabClick(FooterTab.FileSystem)}>
          <div className={cx({ underlined: tab === FooterTab.FileSystem })}>
            <FolderOpen />
            <span>LOCAL ASSETS</span>
          </div>
        </div>
        <div onClick={handleTabClick(FooterTab.AssetsPack)}>
          <div className={cx({ underlined: tab === FooterTab.AssetsPack })}>
            <MdImageSearch />
            <span>ASSETS PACKS</span>
          </div>
        </div>
        <div onClick={handleTabClick(FooterTab.Import)}>
          <div>
            <HiOutlinePlus />
          </div>
        </div>
      </div>
      {tab && (
        <div className="Footer-content">
          {tab === FooterTab.AssetsPack && catalog && <AssetsCatalog value={catalog} />}
          {tab === FooterTab.FileSystem && <ProjectAssetExplorer onImportAsset={handleTabClick(FooterTab.Import)} />}
          {tab === FooterTab.Import && <ImportAsset onSave={handleSave} />}
        </div>
      )}
    </Box>
  )
}

export default React.memo(Footer)
