import React from 'react'
import ReactDOM from 'react-dom/client'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import Hierarchy from './components/Hierarchy/Hierarchy'
import './index.css'
import { initEngine } from './lib/babylon/setup'
import { SceneContext } from './lib/babylon/decentraland/SceneContext'
import {
  connectSceneContextToLocalEngine,
  getHardcodedLoadableScene,
  createSameThreadScene
} from './lib/test-local-scene'
import { getDataLayerRpc } from './lib/data-layer'

const simulatedScene = createSameThreadScene()
const dataLayer = getDataLayerRpc(simulatedScene)

const App = () => {
  return <Hierarchy dataLayer={dataLayer} />
}

async function initScene() {
  const canvas = document.getElementById('renderer') as HTMLCanvasElement // Get the canvas element
  const { babylon, scene } = initEngine(canvas)

  // await scene.debugLayer.show({ showExplorer: true, embedMode: true })

  const ctx = new SceneContext(
    babylon,
    scene,
    getHardcodedLoadableScene('urn:decentraland:entity:bafkreid44xhavttoz4nznidmyj3rjnrgdza7v6l7kd46xdmleor5lmsxfm1')
  )

  ctx.rootNode.position.set(0, 0, 0)

  await simulatedScene.update(0.0)

  await connectSceneContextToLocalEngine(ctx, dataLayer)

  // babylon.onEndFrameObservable.add(async () => {
  //   await simulatedScene.update(babylon.getDeltaTime() / 1000)
  // })
}

void initScene()

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
root.render(
  <React.StrictMode>
    <DndProvider backend={HTML5Backend}>
      <App />
    </DndProvider>
  </React.StrictMode>
)
