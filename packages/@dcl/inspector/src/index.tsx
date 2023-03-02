import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import Hierarchy from './components/Hierarchy/Hierarchy'
import './index.css'
import { InspectorEngine } from './lib/sdk/engine'
import { Renderer } from './components/Renderer'


async function initScene() {
  const App = () => {
    const [inspectorEngine, setInspectorEngine] = useState<InspectorEngine>()
    const handleOnLoad = (value: InspectorEngine) => setInspectorEngine(value)

    return (
      <>
        {inspectorEngine && <Hierarchy inspectorEngine={inspectorEngine} />}
        <Renderer onLoad={handleOnLoad} />
      </>
    )
  }

  const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
  root.render(
    <React.StrictMode>
      <DndProvider backend={HTML5Backend}>
        <App />
      </DndProvider>
    </React.StrictMode>
  )
}

void initScene()
