import React from 'react'
import { useCatalog } from '../../hooks/catalog/useCatalog'
import { AssetsCatalog } from '../AssetsCatalog'
import { EntityInspector } from '../EntityInspector'
import { Hierarchy } from '../Hierarchy'
import { ProjectAssetExplorer } from '../ProjectAssetExplorer'
import { Renderer } from '../Renderer'

const App = () => {
  const [catalog] = useCatalog()
  return (
    <>
      <div className="sidebar">
        <Hierarchy />
        <EntityInspector />
      </div>
      <div className="editor">
        <div>
          <Renderer />
        </div>
        <div style={{ flex: '1', display: 'flex', overflow: 'auto' }}>
          <div style={{ width: '50%', overflow: 'auto' }}>
            <ProjectAssetExplorer />
          </div>
          <div style={{ width: '50%', overflow: 'auto' }}>{catalog && <AssetsCatalog value={catalog} />}</div>
        </div>
      </div>
    </>
  )
}

export default React.memo(App)
