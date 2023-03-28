import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import ReactDOM from 'react-dom/client'

import Hierarchy from './components/Hierarchy/Hierarchy'
import { Renderer } from './components/Renderer/Renderer'
import { SdkProvider } from './components/SdkProvider'

import './index.css'

import { Buffer as MaybeBuffer } from 'buffer'
import { ProjectAssetExplorer } from './components/ProjectAssetExplorer'
import { useCatalog } from './hooks/catalog/useCatalog'
import { AssetsCatalog } from './components/AssetsCatalog'
globalThis.Buffer = MaybeBuffer

async function initScene() {
  const App = () => {
    const [catalog] = useCatalog()
    return (
      <>
        <div className="left">
          <Hierarchy />
        </div>
        <div className="right">
          <Renderer />
          <div>
            <ProjectAssetExplorer />
            {catalog && <AssetsCatalog value={catalog} />}
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
