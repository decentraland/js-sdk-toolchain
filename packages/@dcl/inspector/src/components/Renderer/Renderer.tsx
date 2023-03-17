import React from 'react'
import { useDrop } from 'react-dnd'
import { IAsset } from '../AssetsCatalog/types'
import { getPointerCoords } from '../../lib/babylon/decentraland/mouse-utils'
import { useSdk } from '../../hooks/sdk/useSdk'
import { useRenderer } from '../../hooks/sdk/useRenderer'
import { ROOT } from '../../lib/sdk/tree'

export function Renderer() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)

  const sdk = useSdk()
  const renderer = useRenderer()

  const addAsset = async (asset: IAsset) => {
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
    GltfContainer.create(child, { src: asset.main })
    await engine.update(0)
  }

  const [, drop] = useDrop(
    () => ({
      accept: ['asset'],
      drop: ({ asset }: { asset: IAsset }, monitor) => {
        if (monitor.didDrop()) return
        void addAsset(asset)
      }
    }),
    [addAsset]
  )

  drop(renderer(canvasRef))

  return (
    <div id="main-editor">
      <canvas ref={canvasRef} id="renderer" touch-action="none"></canvas>
    </div>
  )
}
