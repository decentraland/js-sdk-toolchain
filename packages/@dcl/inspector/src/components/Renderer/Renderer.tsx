import { Scene } from '@babylonjs/core'
import { useEffect, useState } from 'react'
import { useDrop } from 'react-dnd'

import { initEngine } from '../../lib/babylon/setup'
import { SceneContext } from '../../lib/babylon/decentraland/SceneContext'
import { getHardcodedLoadableScene, createSameThreadScene } from '../../lib/test-local-scene'
import { getDataLayerRpc } from '../../lib/data-layer'
import { InspectorEngine, createInspectorEngine } from '../../lib/sdk/engine'
import { connectSceneContextToLocalEngine } from '../../lib/data-layer/rpc-engine'
import { IAsset } from '../AssetsCatalog/types'
import { ROOT } from '../../hooks/sdk/tree'
import { Props } from './types'
import { getPointerCoords } from '../../lib/babylon/decentraland/mouse-utils'

export function Renderer({ onLoad }: Props) {
  const [state, setState] = useState<InspectorEngine & { scene: Scene }>()

  const addAsset = async (asset: IAsset) => {
    if (!state) return

    const { engine, sdkComponents, editorComponents, scene } = state
    const child = engine.addEntity()
    const { x, y, z } = await getPointerCoords(scene)
    editorComponents.Label.create(child, { label: asset.name })
    sdkComponents.Transform.create(child, { parent: ROOT, position: { x, y, z } })
    sdkComponents.MeshRenderer.setBox(child)
    // // replace MeshRenderer with line below...
    // // sdkComponents.GltfContainer.create(child, { src: getAssetThumbnailUrl(asset.contents[asset.main]) })
  }

  useEffect(() => {
    const canvas = document.getElementById('renderer') as HTMLCanvasElement // Get the canvas element
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

    setState({ ...inspectorEngine, scene })
    onLoad(inspectorEngine)

    // register some globals for debugging
    Object.assign(globalThis, { simulatedScene, dataLayer, inspectorEngine })
  }, [])

  const [, drop] = useDrop(
    () => ({
      accept: ['asset'],
      drop: ({ asset }: { asset: IAsset }, monitor) => {
        if (monitor.didDrop() || !state) return
        void addAsset(asset)
      }
    }),
    [state]
  )

  return (
    <div id="main-editor">
      <canvas ref={drop} id="renderer" touch-action="none"></canvas>
    </div>
  )
}
