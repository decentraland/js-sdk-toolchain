import React from 'react'
import { useDrop } from 'react-dnd'

import { useRenderer } from '../../hooks/sdk/useRenderer'
import { useSdk } from '../../hooks/sdk/useSdk'
import { getPointerCoords } from '../../lib/babylon/decentraland/mouse-utils'
import { ROOT } from '../../lib/sdk/tree'
import { AssetNodeItem } from '../ProjectAssetExplorer/types'
import { Toolbar } from '../Toolbar'

const Renderer: React.FC = () => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  useRenderer(() => canvasRef)
  const sdk = useSdk()

  const addAsset = async (asset: AssetNodeItem) => {
    if (!sdk) return
    const {
      engine,
      scene,
      components: { Label, Transform, GltfContainer }
    } = sdk
    const child = engine.addEntity()
    const { x, z } = await getPointerCoords(scene)
    Label.create(child, { label: asset.name })
    Transform.create(child, { parent: ROOT, position: { x, y: 0, z } })
    GltfContainer.create(child, { src: asset.asset.src })
    await engine.update(0)
  }

  const [, drop] = useDrop(
    () => ({
      accept: ['project-asset-gltf'],
      drop: ({ asset }: { asset: AssetNodeItem }, monitor) => {
        if (monitor.didDrop()) return
        void addAsset(asset)
      }
    }),
    [addAsset]
  )

  drop(canvasRef)

  return (
    <div id="main-editor">
      <Toolbar />
      <canvas ref={canvasRef} id="renderer" touch-action="none" />
    </div>
  )
}

export default React.memo(Renderer)
