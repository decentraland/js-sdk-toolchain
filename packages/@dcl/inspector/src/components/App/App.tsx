import React, { useState } from 'react'
import { useCatalog } from '../../hooks/catalog/useCatalog'
import { AssetsCatalog } from '../AssetsCatalog'
import { EntityInspector } from '../EntityInspector'
import { Hierarchy } from '../Hierarchy'
import { ProjectAssetExplorer } from '../ProjectAssetExplorer'
import { Renderer } from '../Renderer'
import { MdImageSearch } from 'react-icons/md'
import './App.css'
import { Box } from '../Box'

enum Tab {
  FileSystem = 'FileSystem',
  AssetsPack = 'AssetsPack'
}

const App = () => {
  const [catalog] = useCatalog()
  const [tab, setTab] = useState<Tab | undefined>(undefined)
  function handleTabClick(value: Tab) {
    if (tab === value) {
      return setTab(undefined)
    }
    setTab(value)
  }

  return (
    <>
      <Box>
        <div
          className="sidebar"
          data-vscode-context='{"webviewSection": "sidebar", "preventDefaultContextMenuItems": true}'
        >
          <Hierarchy />
          <EntityInspector />
        </div>
      </Box>
      <div className="editor">
        <Box className="main-editor">
          <Renderer />
        </Box>
        <Box className="footer">
          {tab && (
            <div className="footer-content">
              {tab === Tab.AssetsPack && catalog && <AssetsCatalog value={catalog} />}
              {tab === Tab.FileSystem && <ProjectAssetExplorer />}
            </div>
          )}
          <div className="footer-buttons">
            <div onClick={() => handleTabClick(Tab.FileSystem)}>
              <MdImageSearch />
              <span>File System</span>
            </div>
            <div onClick={() => handleTabClick(Tab.AssetsPack)}>
              <MdImageSearch />
              <span>Assets Pack</span>
            </div>
          </div>
        </Box>
      </div>
    </>
  )
}

export default React.memo(App)
