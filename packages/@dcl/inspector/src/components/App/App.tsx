import React, { useCallback, useState } from 'react'
import { MdImageSearch } from 'react-icons/md'
import { AiFillFolder } from 'react-icons/ai'
import { HiOutlinePlus } from 'react-icons/hi'
import { BsMagic } from 'react-icons/bs'

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
import { fileSystemEvent } from '../../hooks/catalog/useFileSystem'
import AiBox from '../AiBox'

enum Tab {
  FileSystem = 'FileSystem',
  AssetsPack = 'AssetsPack',
  Import = 'Import',
  Ai = 'Ai'
}

const App = () => {
  const [catalog] = useCatalog()
  const [tab, setTab] = useState<Tab | undefined>(undefined)

  const handleTabClick = useCallback(
    (value: Tab) => () => {
      setTab(tab === value ? undefined : value)
    },
    [tab]
  )

  const handleSave = useCallback(() => {
    setTab(Tab.FileSystem)
    fileSystemEvent.emit('change')
  }, [])

  return (
    <Resizable type="horizontal" min={300} initial={300}>
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
              {tab === Tab.Import && <ImportAsset onSave={handleSave} />}
              {tab === Tab.Ai && <AiBox onSave={handleSave} />}
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
            <div onClick={handleTabClick(Tab.Ai)}>
              <BsMagic />
              <span>ShibuGPT</span>
            </div>
          </div>
        </Box>
      </div>
    </Resizable>
  )
}

export default React.memo(App)
