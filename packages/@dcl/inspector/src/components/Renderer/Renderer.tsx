import React, { useEffect, useState } from 'react'
import { useDrop } from 'react-dnd'
import cx from 'classnames'
import { Vector3 } from '@babylonjs/core'

import { withAssetDir } from '../../lib/data-layer/host/fs-utils'
import { useAppDispatch, useAppSelector } from '../../redux/hooks'
import { importAsset } from '../../redux/data-layer'
import { getNode, BuilderAsset, DROP_TYPES, IDrop, ProjectAssetDrop, isDropType } from '../../lib/sdk/drag-drop'
import { useRenderer } from '../../hooks/sdk/useRenderer'
import { useSdk } from '../../hooks/sdk/useSdk'
import { getPointerCoords } from '../../lib/babylon/decentraland/mouse-utils'
import { snapPosition } from '../../lib/babylon/decentraland/snap-manager'
import { loadGltf, removeGltf } from '../../lib/babylon/decentraland/sdkComponents/gltf-container'
import { getConfig } from '../../lib/logic/config'
import { ROOT } from '../../lib/sdk/tree'
import { Asset } from '../../lib/logic/catalog'
import { selectAssetCatalog } from '../../redux/app'
import { areGizmosDisabled } from '../../redux/ui'
import { AssetNodeItem } from '../ProjectAssetExplorer/types'
import { Loading } from '../Loading'
import { isModel, isAsset } from '../EntityInspector/GltfInspector/utils'
import { useIsMounted } from '../../hooks/useIsMounted'
import { Warnings } from '../Warnings'
import { CameraSpeed } from './CameraSpeed'

import './Renderer.css'

const fixedNumber = (val: number) => Math.round(val * 1e2) / 1e2

const Renderer: React.FC = () => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  useRenderer(() => canvasRef)
  const sdk = useSdk()
  const dispatch = useAppDispatch()
  const [isLoading, setIsLoading] = useState(false)
  const isMounted = useIsMounted()
  const files = useAppSelector(selectAssetCatalog)
  const init = !!files
  const gizmosDisabled = useAppSelector(areGizmosDisabled)
  const config = getConfig()

  useEffect(() => {
    if (sdk && init) {
      const { GltfContainer } = sdk.components
      const fileSet = new Set(files.assets.map(($) => $.path))

      for (const [entity, value] of sdk.engine.getEntitiesWith(GltfContainer)) {
        const sceneEntity = sdk.sceneContext.getEntityOrNull(entity)
        if (!sceneEntity) continue

        if (!fileSet.has(value.src)) removeGltf(sceneEntity)
        else loadGltf(sceneEntity, value.src)
      }
    }
  }, [files])

  useEffect(() => {
    if (sdk) {
      sdk.gizmos.setEnabled(!gizmosDisabled)
    }
  }, [sdk, gizmosDisabled])

  const getDropPosition = async () => {
    const pointerCoords = await getPointerCoords(sdk!.scene)
    return snapPosition(new Vector3(fixedNumber(pointerCoords.x), 0, fixedNumber(pointerCoords.z)))
  }

  const addAsset = async (asset: AssetNodeItem, position: Vector3) => {
    if (!sdk) return
    const { operations } = sdk
    operations.addAsset(ROOT, withAssetDir(asset.asset.src), asset.name, position, asset.components as any)
    await operations.dispatch()
  }

  const importBuilderAsset = async (asset: Asset) => {
    const position = await getDropPosition()
    const fileContent: Record<string, Uint8Array> = {}
    const destFolder = 'builder'
    const assetPackageName = asset.name.trim().replaceAll(' ', '_').toLowerCase()
    const path = Object.keys(asset.contents).find(($) => isAsset($))

    if (!path) {
      throw new Error('Invalid asset format: should contain at least one gltf/glb file')
    }

    setIsLoading(true)

    await Promise.all(
      Object.entries(asset.contents).map(async ([path, contentHash]) => {
        try {
          const url = `${config.contentUrl}/contents/${contentHash}`
          const content = await (await fetch(url)).arrayBuffer()
          fileContent[path] = new Uint8Array(content)
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('Error fetching an asset import ' + path)
        }
      })
    )

    // TODO: review this async/await
    dispatch(
      importAsset({
        content: new Map(Object.entries(fileContent)),
        basePath: withAssetDir(destFolder),
        assetPackageName
      })
    )

    if (!isMounted()) return
    setIsLoading(false)

    const model: AssetNodeItem = {
      type: 'asset',
      name: asset.name,
      parent: null,
      asset: { type: 'gltf', src: `${destFolder}/${assetPackageName}/${path}` },
      components: asset.components
    }
    await addAsset(model, position)
  }

  const [, drop] = useDrop(
    () => ({
      accept: DROP_TYPES,
      drop: async (item: IDrop, monitor) => {
        if (monitor.didDrop()) return
        const itemType = monitor.getItemType()

        if (isDropType<BuilderAsset>(item, itemType, 'builder-asset')) {
          void importBuilderAsset(item.value)
          return
        }

        if (isDropType<ProjectAssetDrop>(item, itemType, 'project-asset')) {
          const node = item.context.tree.get(item.value)!
          const model = getNode(node, item.context.tree, isModel)
          if (model) {
            const position = await getDropPosition()
            await addAsset(model, position)
          }
        }
      }
    }),
    [addAsset]
  )

  drop(canvasRef)

  return (
    <div className={cx('Renderer', { 'is-loaded': !isLoading, 'is-loading': isLoading })}>
      {isLoading && <Loading />}
      <Warnings />
      <CameraSpeed />
      <canvas ref={canvasRef} id="canvas" touch-action="none" />
    </div>
  )
}

export default React.memo(Renderer)
