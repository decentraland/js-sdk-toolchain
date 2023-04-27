import React, { useCallback, useState } from 'react'
import { MdImageSearch } from 'react-icons/md'
import { AiFillFolder } from 'react-icons/ai'
import { HiOutlinePlus } from 'react-icons/hi'

import { useCatalog } from '../../hooks/catalog/useCatalog'
import { AssetsCatalog } from '../AssetsCatalog'
import { EntityInspector } from '../EntityInspector'
import { Hierarchy } from '../Hierarchy'
import { ProjectAssetExplorer } from '../ProjectAssetExplorer'
import { Renderer } from '../Renderer'
import { Box } from '../Box'
import { Toolbar } from '../Toolbar'

import './App.css'
import { Resizable } from '../Resizable'
import ImportAsset from '../ImportAsset'

enum Tab {
  FileSystem = 'FileSystem',
  AssetsPack = 'AssetsPack',
  Import = 'Import'
}

const App = () => {
  const [catalog] = useCatalog()
  const [tab, setTab] = useState<Tab | undefined>(undefined)

  const handleTabClick = useCallback((value: Tab) => () => {
    setTab(tab === value ? undefined : value)
  }, [tab])

  return (
    <Resizable type="horizontal" min={280} initial={280}>
      <Box>
        <div
          className="sidebar"
          data-vscode-context='{"webviewSection": "sidebar", "preventDefaultContextMenuItems": true}'
        >
          <Resizable type="vertical" min={130} initial={130} max={730}>
            <Hierarchy />
            <EntityInspector />
          </Resizable>
        </div>
      </Box>
      <div className="editor">
        <Box className="composite-renderer">
          <Toolbar />
          <Renderer />
        </Box>
        <Box className="footer">
          {tab && (
            <div className="footer-content">
              {tab === Tab.AssetsPack && catalog && <AssetsCatalog value={catalog} />}
              {tab === Tab.FileSystem && <ProjectAssetExplorer onImportAsset={handleTabClick(Tab.Import)} />}
              {tab === Tab.Import && <ImportAsset onSave={handleTabClick(Tab.FileSystem)} />}
            </div>
          )}
          <div className="footer-buttons">
            <div onClick={handleTabClick(Tab.FileSystem)}>
              <AiFillFolder />
              <span>Asset Catalog</span>
            </div>
            <div onClick={handleTabClick(Tab.Import)}>
              <HiOutlinePlus />
              <span>Import Asset</span>
            </div>
            <div onClick={handleTabClick(Tab.AssetsPack)}>
              <MdImageSearch />
              <span>World Assets Pack</span>
            </div>
          </div>
        </Box>
      </div>
    </Resizable>
  )
}

export default React.memo(App)
