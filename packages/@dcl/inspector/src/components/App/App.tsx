import React, { useState } from 'react'
import { useCatalog } from '../../hooks/catalog/useCatalog'
import { AssetsCatalog } from '../AssetsCatalog'
import { EntityInspector } from '../EntityInspector'
import { Hierarchy } from '../Hierarchy'
import { ProjectAssetExplorer } from '../ProjectAssetExplorer'
import { Renderer } from '../Renderer'
import { MdImageSearch } from 'react-icons/md'
import './App.css'

const App = () => {
  const [catalog] = useCatalog()
  const [toggle, setToggle] = useState(false)
  const expandedClass = toggle && 'expanded'
  return (
    <>
      <div
        className="sidebar"
        data-vscode-context='{"webviewSection": "sidebar", "preventDefaultContextMenuItems": true}'
      >
        <Hierarchy />
        <EntityInspector />
      </div>
      <div className="editor">
        <Renderer />
        <div className={`editor-assets ${expandedClass}`}>
          <div className="project-assets">
            <div className="editor-assets-title" onClick={() => setToggle(!toggle)}>
              <MdImageSearch />
              <span>Assets Pack</span>
            </div>
            {expandedClass && <ProjectAssetExplorer />}
          </div>
          {catalog && expandedClass && <AssetsCatalog value={catalog} />}
        </div>
      </div>
    </>
  )
}

export default React.memo(App)
