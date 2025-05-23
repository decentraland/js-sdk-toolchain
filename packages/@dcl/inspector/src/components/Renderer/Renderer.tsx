/* eslint-disable no-console */
import React, { useCallback, useEffect, useState } from 'react'
import { useDrop } from 'react-dnd'
import cx from 'classnames'
import { Vector3 } from '@babylonjs/core'
import { Entity } from '@dcl/ecs'

import { DIRECTORY, withAssetDir } from '../../lib/data-layer/host/fs-utils'
import { useAppDispatch, useAppSelector } from '../../redux/hooks'
import { getDataLayerInterface, importAsset, saveThumbnail } from '../../redux/data-layer'
import {
  getNode,
  CatalogAssetDrop,
  DROP_TYPES,
  IDrop,
  LocalAssetDrop,
  isDropType,
  DropTypesEnum,
  CustomAssetDrop
} from '../../lib/sdk/drag-drop'
import { useRenderer } from '../../hooks/sdk/useRenderer'
import { useSdk } from '../../hooks/sdk/useSdk'
import { getPointerCoords } from '../../lib/babylon/decentraland/mouse-utils'
import { snapPosition } from '../../lib/babylon/decentraland/snap-manager'
import { getConfig } from '../../lib/logic/config'
import { ROOT } from '../../lib/sdk/tree'
import { Asset, CustomAsset, isGround, isSmart } from '../../lib/logic/catalog'
import { areGizmosDisabled, getHiddenPanels, isGroundGridDisabled } from '../../redux/ui'
import { AssetNodeItem } from '../ProjectAssetExplorer/types'
import { Loading } from '../Loading'
import { isModel, isAsset } from '../EntityInspector/GltfInspector/utils'
import { useIsMounted } from '../../hooks/useIsMounted'
import {
  useHotkey,
  BACKSPACE,
  DELETE,
  COPY,
  PASTE,
  COPY_ALT,
  PASTE_ALT,
  ZOOM_IN,
  ZOOM_IN_ALT,
  ZOOM_OUT_ALT,
  ZOOM_OUT,
  RESET_CAMERA,
  DUPLICATE,
  DUPLICATE_ALT
} from '../../hooks/useHotkey'
import { analytics, Event } from '../../lib/logic/analytics'
import { Warnings } from '../Warnings'
import { CameraSpeed } from './CameraSpeed'
import { Shortcuts } from './Shortcuts'
import { Metrics } from './Metrics'

import './Renderer.css'
import { PanelName } from '../../redux/ui/types'

const ZOOM_DELTA = new Vector3(0, 0, 1.1)
const fixedNumber = (val: number) => Math.round(val * 1e2) / 1e2

const SINGLE_TILE_HINT_OFFSET = 30

const Renderer: React.FC = () => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  useRenderer(() => canvasRef)
  const sdk = useSdk()
  const dispatch = useAppDispatch()
  const [isLoading, setIsLoading] = useState(false)
  const isMounted = useIsMounted()
  const gizmosDisabled = useAppSelector(areGizmosDisabled)
  const groundGridDisabled = useAppSelector(isGroundGridDisabled)
  const config = getConfig()
  const [copyEntities, setCopyEntities] = useState<Entity[]>([])
  const hiddenPanels = useAppSelector(getHiddenPanels)
  const [placeSingleTile, setPlaceSingleTile] = useState(false)
  const [showSingleTileHint, setShowSingleTileHint] = useState(false)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (sdk) {
      sdk.gizmos.setEnabled(!gizmosDisabled)
    }
  }, [sdk, gizmosDisabled])

  useEffect(() => {
    if (sdk) {
      const layout = sdk.scene.getNodeByName('layout')
      if (layout) {
        layout.setEnabled(!groundGridDisabled)
      }
    }
  }, [sdk, groundGridDisabled])

  const deleteSelectedEntities = useCallback(() => {
    if (!sdk) return
    const selectedEntitites = sdk.operations.getSelectedEntities()
    selectedEntitites.forEach((entity) => sdk.operations.removeEntity(entity))
    void sdk.operations.dispatch()
  }, [sdk])

  const duplicateSelectedEntities = useCallback(() => {
    if (!sdk) return
    const camera = sdk.scene.activeCamera!
    camera.detachControl()
    const selectedEntitites = sdk.operations.getSelectedEntities()
    selectedEntitites.forEach((entity) => sdk.operations.duplicateEntity(entity))
    void sdk.operations.dispatch()
    setTimeout(() => {
      camera.attachControl(canvasRef.current, true)
    }, 100)
  }, [sdk])

  const copySelectedEntities = useCallback(() => {
    if (!sdk) return
    const selectedEntitites = sdk.operations.getSelectedEntities()
    setCopyEntities([...selectedEntitites])
  }, [sdk, setCopyEntities])

  const pasteSelectedEntities = useCallback(() => {
    if (!sdk) return
    sdk.operations.removeSelectedEntities()
    copyEntities.forEach((entity) => sdk.operations.duplicateEntity(entity))
    void sdk.operations.dispatch()
  }, [sdk, copyEntities])

  const zoomIn = useCallback(() => {
    if (!sdk) return
    const camera = sdk.editorCamera.getCamera()
    const dir = camera.getDirection(ZOOM_DELTA)
    camera.position.addInPlace(dir)
  }, [sdk])

  const zoomOut = useCallback(() => {
    if (!sdk) return
    const camera = sdk.editorCamera.getCamera()
    const dir = camera.getDirection(ZOOM_DELTA).negate()
    camera.position.addInPlace(dir)
  }, [sdk])

  const resetCamera = useCallback(() => {
    if (!sdk) return
    sdk.editorCamera.resetCamera()
  }, [sdk])

  useHotkey([DELETE, BACKSPACE], deleteSelectedEntities, document.body)
  useHotkey([COPY, COPY_ALT], copySelectedEntities, document.body)
  useHotkey([PASTE, PASTE_ALT], pasteSelectedEntities, document.body)
  useHotkey([ZOOM_IN, ZOOM_IN_ALT], zoomIn, document.body)
  useHotkey([ZOOM_OUT, ZOOM_OUT_ALT], zoomOut, document.body)
  useHotkey([RESET_CAMERA], resetCamera, document.body)
  useHotkey([DUPLICATE, DUPLICATE_ALT], duplicateSelectedEntities, document.body)

  // listen to ctrl key to place single tile
  useEffect(() => {
    const prevDrag = document.ondrag
    function handleDrag(event: MouseEvent) {
      if (event.shiftKey && !placeSingleTile) {
        setPlaceSingleTile(true)
      } else if (placeSingleTile && !event.shiftKey) {
        setPlaceSingleTile(false)
      }
      if (!placeSingleTile && event.clientX && event.clientY) {
        setMousePosition({ x: event.clientX, y: event.clientY })
      }
    }
    document.ondrag = handleDrag
    return () => {
      document.ondrag = prevDrag
    }
  }, [placeSingleTile, setPlaceSingleTile])

  // clear hint
  useEffect(() => {
    const prevDragEnd = document.ondragend
    function handleDragEnd() {
      setShowSingleTileHint(false)
    }
    document.ondragend = handleDragEnd
    return () => {
      document.ondragend = prevDragEnd
    }
  }, [showSingleTileHint, setShowSingleTileHint])

  const getDropPosition = async () => {
    const pointerCoords = await getPointerCoords(sdk!.scene)
    return snapPosition(new Vector3(fixedNumber(pointerCoords.x), 0, fixedNumber(pointerCoords.z)))
  }

  const addAsset = async (asset: AssetNodeItem, position: Vector3, basePath: string, isCustom: boolean) => {
    if (!sdk) return
    const { operations } = sdk
    operations.addAsset(
      ROOT,
      asset.asset.src,
      asset.name,
      position,
      basePath,
      sdk.enumEntity,
      asset.composite,
      asset.asset.id,
      isCustom
    )
    await operations.dispatch()
    analytics.track(Event.ADD_ITEM, {
      itemId: asset.asset.id,
      itemName: asset.name,
      itemPath: asset.asset.src,
      isSmart: isSmart(asset),
      isCustom
    })
    canvasRef.current?.focus()
  }

  const setGround = async (asset: AssetNodeItem, basePath: string) => {
    if (!sdk) return
    const { operations } = sdk
    const src = `${basePath}/${asset.asset.src}`
    operations.setGround(src)
    await operations.dispatch()
    analytics.track(Event.SET_GROUND, {
      itemId: asset.asset.id,
      itemName: asset.name,
      itemPath: asset.asset.src
    })
    canvasRef.current?.focus()
  }

  const importCustomAsset = async (asset: CustomAsset) => {
    const destFolder = 'custom'
    const assetPackageName = asset.name.trim().replaceAll(' ', '_').toLowerCase()
    const position = await getDropPosition()
    const content: Map<string, Uint8Array> = new Map()

    const dataLayer = getDataLayerInterface()
    if (!dataLayer) return

    // Find the common base path from all resources
    const customAssetBasePath = asset.resources.reduce((basePath, path) => {
      const pathParts = path.split('/')
      pathParts.pop() // Remove filename
      const currentPath = pathParts.join('/')
      if (!basePath) return currentPath

      // Find common prefix between paths
      const basePathParts = basePath.split('/')
      const commonParts = []
      for (let i = 0; i < basePathParts.length; i++) {
        if (basePathParts[i] === pathParts[i]) {
          commonParts.push(basePathParts[i])
        } else {
          break
        }
      }
      return commonParts.join('/')
    }, '')

    const files = await Promise.all(
      asset.resources.map(async (path) => ({
        path: path.startsWith(customAssetBasePath) ? path.replace(customAssetBasePath, '') : path,
        content: await dataLayer.getFile({ path }).then((res) => res.content)
      }))
    )
    for (const file of files) {
      content.set(file.path, file.content)
    }
    const model: AssetNodeItem = {
      type: 'asset',
      name: asset.name,
      parent: null,
      asset: { type: 'gltf', src: '', id: asset.id },
      composite: asset.composite
    }
    const basePath = withAssetDir(`${destFolder}/${assetPackageName}`)

    dispatch(importAsset({ content, basePath, assetPackageName: '', reload: true }))
    await addAsset(model, position, basePath, true)
  }

  const importCatalogAsset = async (asset: Asset) => {
    const position = await getDropPosition()
    const fileContent: Record<string, Uint8Array> = {}
    const destFolder = 'asset-packs'
    const assetPackageName = asset.name.trim().replaceAll(' ', '_').toLowerCase()
    const path = Object.keys(asset.contents).find(($) => isAsset($))
    let thumbnail: Uint8Array | undefined

    setIsLoading(true)

    await Promise.all(
      Object.entries(asset.contents).map(async ([path, contentHash]) => {
        try {
          const url = `${config.contentUrl}/contents/${contentHash}`
          const response = await fetch(url)
          const content = new Uint8Array(await response.arrayBuffer())
          if (path === 'thumbnail.png') {
            thumbnail = content
          } else {
            fileContent[path] = content
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('Error fetching an asset import ' + path)
        }
      })
    )

    // TODO: review this async/await
    const content = new Map(Object.entries(fileContent))
    if (content.size > 0) {
      dispatch(
        importAsset({
          content,
          basePath: withAssetDir(destFolder),
          assetPackageName,
          reload: true
        })
      )
    }

    if (thumbnail) {
      const name = path ? (path.split('/').pop() as string) : asset.name
      const ext = name.split('.').pop() as string
      dispatch(
        saveThumbnail({
          content: thumbnail,
          path: `${DIRECTORY.THUMBNAILS}/${name.replace(`.${ext}`, '.png')}`
        })
      )
    }

    if (!isMounted()) return
    setIsLoading(false)

    const model: AssetNodeItem = {
      type: 'asset',
      name: asset.name,
      parent: null,
      asset: { type: path ? 'gltf' : 'unknown', src: path ?? '', id: asset.id },
      composite: asset.composite
    }
    const basePath = withAssetDir(`${destFolder}/${assetPackageName}`)
    if (isGround(asset) && !placeSingleTile) {
      await setGround(model, basePath)
    } else {
      // place single tiles slightly above the ground
      if (isGround(asset)) {
        position.y += 0.25
      }
      await addAsset(model, position, basePath, false)
    }
  }

  const [, drop] = useDrop(
    () => ({
      accept: DROP_TYPES,
      drop: async (item: IDrop, monitor) => {
        if (monitor.didDrop()) return
        const itemType = monitor.getItemType()

        if (isDropType<CatalogAssetDrop>(item, itemType, DropTypesEnum.CatalogAsset)) {
          void importCatalogAsset(item.value)
          return
        }

        if (isDropType<LocalAssetDrop>(item, itemType, DropTypesEnum.LocalAsset)) {
          const node = item.context.tree.get(item.value)!
          const model = getNode(node, item.context.tree, isModel)
          if (model) {
            const position = await getDropPosition()
            await addAsset(model, position, DIRECTORY.ASSETS, false)
          }
        }

        if (isDropType<CustomAssetDrop>(item, itemType, DropTypesEnum.CustomAsset)) {
          void importCustomAsset(item.value)
          return
        }
      },
      hover(item, monitor) {
        if (isDropType<CatalogAssetDrop>(item, monitor.getItemType(), DropTypesEnum.CatalogAsset)) {
          const asset = item.value
          if (isGround(asset)) {
            if (!showSingleTileHint) {
              setShowSingleTileHint(true)
            }
          } else if (showSingleTileHint) {
            setShowSingleTileHint(false)
          }
        }
      }
    }),
    [addAsset, showSingleTileHint, setShowSingleTileHint]
  )

  drop(canvasRef)

  return (
    <div
      className={cx('Renderer', {
        'is-loaded': !isLoading,
        'is-loading': isLoading
      })}
    >
      {isLoading && <Loading />}
      <Warnings />
      <CameraSpeed />
      {!hiddenPanels[PanelName.METRICS] && <Metrics />}
      {!hiddenPanels[PanelName.SHORTCUTS] && (
        <Shortcuts canvas={canvasRef} onResetCamera={resetCamera} onZoomIn={zoomIn} onZoomOut={zoomOut} />
      )}
      <canvas ref={canvasRef} id="canvas" touch-action="none" />
      <div
        style={{ top: mousePosition.y + SINGLE_TILE_HINT_OFFSET, left: mousePosition.x + SINGLE_TILE_HINT_OFFSET }}
        className={cx('single-tile-hint', { 'is-visible': !placeSingleTile && showSingleTileHint })}
      >
        Hold <b>SHIFT</b> to place a single tile
      </div>
    </div>
  )
}

export default React.memo(Renderer)
