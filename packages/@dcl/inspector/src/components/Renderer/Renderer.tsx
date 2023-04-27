import React from 'react'
import { useDrop } from 'react-dnd'

import { BuilderAsset, DROP_TYPES, IDrop, ProjectAssetDrop, isDropType } from '../../lib/sdk/drag-drop'
import { useRenderer } from '../../hooks/sdk/useRenderer'
import { useSdk } from '../../hooks/sdk/useSdk'
import { getPointerCoords } from '../../lib/babylon/decentraland/mouse-utils'
import { ROOT } from '../../lib/sdk/tree'
import { changeSelectedEntity } from '../../lib/utils/gizmo'
import { AssetNodeItem } from '../ProjectAssetExplorer/types'
import { IAsset } from '../AssetsCatalog/types'
import { getModel, isAsset } from '../EntityInspector/GltfInspector/utils'

import './Renderer.css'

const Renderer: React.FC = () => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  useRenderer(() => canvasRef)
  const sdk = useSdk()

  const addAsset = async (asset: AssetNodeItem) => {
    if (!sdk) return
    const {
      engine,
      scene,
      components: { EntityNode, Transform, GltfContainer }
    } = sdk
    const child = engine.addEntity()
    const { x, z } = await getPointerCoords(scene)
    EntityNode.create(child, { label: asset.name, parent: ROOT })
    Transform.create(child, { parent: ROOT, position: { x, y: 0, z } })
    GltfContainer.create(child, { src: asset.asset.src })
    changeSelectedEntity(child, engine)
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
    const path = Object.keys(fileContent).find(($) => isAsset($))
    if (!path) {
      throw new Error('Invalid asset format: should contain at least one gltf/glb file')
    }
    await sdk!.dataLayer.importAsset({
      content: new Map(Object.entries(fileContent)),
      basePath: destFolder,
      assetPackageName
    })
    const model: AssetNodeItem = {
      type: 'asset',
      name: asset.name,
      parent: null,
      asset: { type: 'gltf', src: `${destFolder}/${assetPackageName}/${path}` }
    }
    await addAsset(model)
  }

  const [, drop] = useDrop(
    () => ({
      accept: DROP_TYPES,
      drop: (item: IDrop, monitor) => {
        if (monitor.didDrop()) return
        const itemType = monitor.getItemType()

        if (isDropType<BuilderAsset>(item, itemType, 'builder-asset')) {
          void importBuilderAsset(item.value)
          return
        }

        if (isDropType<ProjectAssetDrop>(item, itemType, 'project-asset-gltf')) {
          const node = item.context.tree.get(item.value)!
          const model = getModel(node, item.context.tree)
          if (model) void addAsset(model)
        }
      }
    }),
    [addAsset]
  )

  drop(canvasRef)

  return (
    <div className="Renderer">
      <canvas ref={canvasRef} id="canvas" touch-action="none" />
    </div>
  )
}

export default React.memo(Renderer)
