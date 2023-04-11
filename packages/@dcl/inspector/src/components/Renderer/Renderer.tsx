/* eslint-disable no-console */
import React from 'react'
import { useDrop } from 'react-dnd'

import { useRenderer } from '../../hooks/sdk/useRenderer'
import { useSdk } from '../../hooks/sdk/useSdk'
import { getPointerCoords } from '../../lib/babylon/decentraland/mouse-utils'
import { ROOT } from '../../lib/sdk/tree'
import { AssetNodeItem } from '../ProjectAssetExplorer/types'
import { Toolbar } from '../Toolbar'
import { IAsset } from '../AssetsCatalog/types'

const cachedFiles = new Set()

const Renderer: React.FC = () => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  useRenderer(() => canvasRef)
  const sdk = useSdk()

  const addAsset = async (asset: Pick<AssetNodeItem, 'asset' | 'name'>) => {
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

  const importBuilderAsset = async (asset: IAsset) => {
    const fileContent: Record<string, Uint8Array> = {}
    const destFolder = 'world-assets'
    const assetPackageName = asset.name.trim().replaceAll(' ', '_').toLowerCase()
    await Promise.all(
      Object.entries(asset.contents).map(async ([path, contentHash]) => {
        try {
          const url = `https://builder-api.decentraland.org/v1/storage/contents/${contentHash}`
          const content = await (await fetch(url)).arrayBuffer()
          fileContent[path] = new Uint8Array(content)
        } catch (err) {
          console.error('Error fetching an asset import ' + path)
        }
      })
    )
    await sdk!.dataLayer.importAsset({
      content: new Map(Object.entries(fileContent)),
      basePath: destFolder,
      assetPackageName
    })
    const path = Object.keys(fileContent)[0]
    await addAsset({ asset: { ...asset, src: `${destFolder}/${assetPackageName}/${path}`  }, name: asset.name })
  }

  const [, drop] = useDrop(
    () => ({
      accept: ['project-asset-gltf', 'builder-asset'],
      drop: (val: { asset: AssetNodeItem | IAsset }, monitor) => {
        if (monitor.getItemType() === 'builder-asset') {
          void importBuilderAsset(val.asset as IAsset)
          return
        }
        if (monitor.didDrop()) return
        console.log(val.asset)
        void addAsset(val.asset as AssetNodeItem)
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
