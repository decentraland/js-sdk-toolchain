import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import ReactDOM from 'react-dom/client'

import Hierarchy from './components/Hierarchy/Hierarchy'
import { Renderer } from './components/Renderer/Renderer'
import { SdkProvider } from './components/SdkProvider'

import './index.css'

import { Buffer as MaybeBuffer } from 'buffer'
import { AssetsCatalog } from './components/AssetsCatalog'
import { EntityInspector } from './components/EntityInspector'
import { ProjectAssetExplorer } from './components/ProjectAssetExplorer'
import { useCatalog } from './hooks/catalog/useCatalog'
globalThis.Buffer = MaybeBuffer

async function initScene() {
  const App = () => {
    const [catalog] = useCatalog()
    return (
      <>
        <div className="left">
          <Hierarchy />
          <EntityInspector />
        </div>
        <div className="right">
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

  const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
  root.render(
    <DndProvider backend={HTML5Backend}>
      <SdkProvider>
        <App />
      </SdkProvider>
    </DndProvider>
  )
}

void initScene()
