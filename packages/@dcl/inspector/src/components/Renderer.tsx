import { useEffect, useRef } from 'react'

import { initEngine } from '../lib/babylon/setup'
import { SceneContext } from '../lib/babylon/decentraland/SceneContext'
import { getHardcodedLoadableScene, createSameThreadScene } from '../lib/test-local-scene'
import { getDataLayerRpc } from '../lib/data-layer'
import { InspectorEngine, createInspectorEngine } from '../lib/sdk/engine'
import { connectSceneContextToLocalEngine } from '../lib/data-layer/rpc-engine'

export function Renderer({ onLoad }: { onLoad: (value: InspectorEngine) => void }) {
  useEffect(() => {
    const canvas = document.getElementById("renderer") as HTMLCanvasElement // Get the canvas element
    const { babylon, scene } = initEngine(canvas)

    // await scene.debugLayer.show({ showExplorer: true, embedMode: true })

    // initialize DataLayer
    const simulatedScene = createSameThreadScene()
    const dataLayer = getDataLayerRpc(simulatedScene)

    // initialize babylon scene
    const ctx = new SceneContext(
      babylon,
      scene,
      getHardcodedLoadableScene('urn:decentraland:entity:bafkreid44xhavttoz4nznidmyj3rjnrgdza7v6l7kd46xdmleor5lmsxfm1')
    )
    ctx.rootNode.position.set(0, 0, 0)
    void connectSceneContextToLocalEngine(ctx, dataLayer)

    // create inspector engine context and components
    const inspectorEngine = createInspectorEngine(dataLayer)

    onLoad(inspectorEngine)

    // register some globals for debugging
    Object.assign(globalThis, { simulatedScene, dataLayer, inspectorEngine })
  }, [])

  return (
    <div id="main-editor">
      <canvas id="renderer" touch-action="none"></canvas>
    </div>
  )
}
