import { Scene } from '@babylonjs/core'
import { useEffect, useState } from 'react'
import { useDrop } from 'react-dnd'

import { initEngine } from '../../lib/babylon/setup'
import { SceneContext } from '../../lib/babylon/decentraland/SceneContext'
import { getHardcodedLoadableScene } from '../../lib/sdk/test-local-scene'
import { getDataLayerRpc } from '../../lib/data-layer'
import { InspectorEngine, createInspectorEngine } from '../../lib/sdk/engine'
import { IAsset } from '../AssetsCatalog/types'
import { ROOT } from '../../hooks/sdk/tree'
import { Props } from './types'
import { getPointerCoords } from '../../lib/babylon/decentraland/mouse-utils'
import { useCatalog } from '../../hooks/catalog/useCatalog'

export function Renderer({ onLoad }: Props) {
  const [state, setState] = useState<InspectorEngine & { scene: Scene }>()
  const [catalog] = useCatalog()

  const addAsset = async (asset: IAsset) => {
    if (!state) return

    const { engine, sdkComponents, editorComponents, scene } = state
    const child = engine.addEntity()
    const { x, _y, z } = await getPointerCoords(scene)
    editorComponents.Label.create(child, { label: asset.name })
    sdkComponents.Transform.create(child, { parent: ROOT, position: { x, y: 0, z } })
    sdkComponents.GltfContainer.create(child, { src: asset.main })
  }

  useEffect(() => {
    async function init() {
      if (!catalog) return
      const canvas = document.getElementById('renderer') as HTMLCanvasElement // Get the canvas element
      const { babylon, scene } = initEngine(canvas)

      // await scene.debugLayer.show({ showExplorer: true, embedMode: true })

      // initialize DataLayer
      const dataLayer = await getDataLayerRpc()

      // initialize babylon scene
      const ctx = new SceneContext(
        babylon,
        scene,
        getHardcodedLoadableScene(
          'urn:decentraland:entity:bafkreid44xhavttoz4nznidmyj3rjnrgdza7v6l7kd46xdmleor5lmsxfm1',
          catalog
        )
      )
      ctx.rootNode.position.set(0, 0, 0)
      // Connect babylon engine with dataLayer transport
      void ctx.connectDataLayer(dataLayer)

      // create inspector engine context and components
      const inspectorEngine = createInspectorEngine(dataLayer)

      setState({ ...inspectorEngine, scene })
      onLoad(inspectorEngine)

      // register some globals for debugging
      Object.assign(globalThis, { dataLayer, inspectorEngine })
    }
    init().catch((err) => console.log(err))
  }, [catalog])

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
