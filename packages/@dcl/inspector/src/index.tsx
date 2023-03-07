import { useState } from 'react'
import ReactDOM from 'react-dom/client'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'

import { InspectorEngine } from './lib/sdk/engine'

import { AssetsCatalog, ITheme } from './components/AssetsCatalog'
import Hierarchy from './components/Hierarchy/Hierarchy'
import { Renderer } from './components/Renderer/Renderer'

import './index.css'

// TODO: move this to data service
// eslint-disable-next-line @typescript-eslint/no-var-requires
const assetsCatalogJson = require('./components/AssetsCatalog/catalog.json') as ITheme[]

async function initScene() {
  const App = () => {
    const [inspectorEngine, setInspectorEngine] = useState<InspectorEngine>()
    const handleOnLoad = (value: InspectorEngine) => setInspectorEngine(value)

    return (
      <>
        <div className="left">{inspectorEngine && <Hierarchy inspectorEngine={inspectorEngine} />}</div>
        <div className="right">
          <Renderer onLoad={handleOnLoad} />
          <AssetsCatalog value={assetsCatalogJson} />
        </div>
      </>
    )
  }

  const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
  root.render(
    <DndProvider backend={HTML5Backend}>
      <App />
    </DndProvider>
  )
}

void initScene()
