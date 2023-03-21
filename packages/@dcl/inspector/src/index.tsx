import ReactDOM from 'react-dom/client'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'

import { AssetsCatalog } from './components/AssetsCatalog'
import Hierarchy from './components/Hierarchy/Hierarchy'
import { SdkProvider } from './components/SdkProvider'
import { Renderer } from './components/Renderer/Renderer'
import { useCatalog } from './hooks/catalog/useCatalog'

import './index.css'

import { Buffer as MaybeBuffer } from 'buffer'
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
          {catalog && <AssetsCatalog value={catalog} />}
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
