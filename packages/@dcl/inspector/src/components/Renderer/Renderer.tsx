import React from 'react'
import { useDrop } from 'react-dnd'
import { IAsset } from '../AssetsCatalog/types'
import { getPointerCoords } from '../../lib/babylon/decentraland/mouse-utils'
import { useSdk } from '../../hooks/sdk/useSdk'
import { useRenderer } from '../../hooks/sdk/useRenderer'
import { ROOT } from '../../lib/sdk/tree'
import { getNextFreeEntity } from '../../lib/sdk/engine'
import { AssetNodeItem } from '../ProjectAssetExplorer/types'

export function Renderer() {
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
    const child = getNextFreeEntity(engine)
    const { x, z } = await getPointerCoords(scene)
    Label.create(child, { label: asset.name })
    Transform.create(child, { parent: ROOT, position: { x, y: 0, z } })
    GltfContainer.create(child, { src: asset.asset.src })
    await engine.update(0)
  }

  const [, drop] = useDrop(
    () => ({
      accept: ['asset', 'project-asset'],
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
      <canvas ref={canvasRef} id="renderer" touch-action="none"></canvas>
    </div>
  )
}
