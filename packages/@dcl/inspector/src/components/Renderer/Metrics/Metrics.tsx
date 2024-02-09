import React, { useCallback, useEffect, useMemo } from 'react'
import cx from 'classnames'
import { IoGridOutline as SquaresGridIcon, IoAlertCircleOutline as AlertIcon } from 'react-icons/io5'
import { CrdtMessageType } from '@dcl/ecs'

import { withSdk, WithSdkProps } from '../../../hoc/withSdk'
import { useChange } from '../../../hooks/sdk/useChange'
import { useOutsideClick } from '../../../hooks/useOutsideClick'
import type { Layout } from '../../../lib/utils/layout'
import { GROUND_MESH_PREFIX, PARCEL_SIZE } from '../../../lib/utils/scene'
import { Button } from '../../Button'
import { getSceneLimits } from './utils'
import type { Metrics } from './types'

import './Metrics.css'

const ICON_SIZE = 18
const IGNORE_MATERIALS = [
  // Babylon default materials
  'BackgroundSkyboxMaterial',
  'BackgroundPlaneMaterial',
  // Utils Materials
  'entityOutsideLayoutMaterial',
  'layout_grid',
  'grid',
  'base-box',
  'collider-material',
  'skyBox',
  '__GLTFLoader._default'
]
const IGNORE_TEXTURES = [
  // Babylon default textures
  'https://assets.babylonjs.com/environments/backgroundGround.png',
  'https://assets.babylonjs.com/environments/backgroundSkybox.dds',
  'https://assets.babylonjs.com/environments/environmentSpecular.env',
  'EffectLayerMainRTT',
  'HighlightLayerBlurRTT',
  'data:EnvironmentBRDFTexture0',
  // Utils Textures
  'GlowLayerBlurRTT',
  'GlowLayerBlurRTT2'
]
const IGNORE_MESHES = ['BackgroundHelper', 'BackgroundPlane', 'BackgroundSkybox']

const Metrics = withSdk<WithSdkProps>(({ sdk }) => {
  const ROOT = sdk.engine.RootEntity
  const [showMetrics, setShowMetrics] = React.useState(false)
  const [metrics, setMetrics] = React.useState<Metrics>({
    triangles: 0,
    entities: 0,
    bodies: 0,
    materials: 0,
    textures: 0
  })
  const [sceneLayout, setSceneLayout] = React.useState<Layout>({
    base: { x: 0, y: 0 },
    parcels: []
  })

  const handleUpdateMetrics = useCallback(() => {
    const meshes = sdk.scene.meshes.filter(
      (mesh) => !(IGNORE_MESHES.includes(mesh.id) || mesh.id.startsWith(GROUND_MESH_PREFIX))
    )
    const triangles = meshes.reduce((acc, mesh) => acc + mesh.getTotalVertices(), 0)
    const entities = (sdk.components.Nodes.getOrNull(ROOT)?.value ?? [ROOT]).length - 1
    const uniqueTextures = new Set(
      sdk.scene.textures
        .filter((texture) => !IGNORE_TEXTURES.includes(texture.name))
        .map((texture) => texture.getInternalTexture()!.uniqueId)
    )
    const uniqueMaterials = new Set(
      sdk.scene.materials.map((material) => material.id).filter((id) => !IGNORE_MATERIALS.includes(id))
    )
    setMetrics({
      triangles: triangles,
      entities: entities,
      bodies: meshes.length,
      materials: uniqueMaterials.size,
      textures: uniqueTextures.size
    })
  }, [sdk])

  const handleUpdateSceneLayout = useCallback(() => {
    const scene = sdk.components.Scene.getOrNull(ROOT)
    if (scene) {
      setSceneLayout({ ...(scene.layout as Layout) })
    }
  }, [sdk, setSceneLayout])

  useEffect(() => {
    sdk.scene.onDataLoadedObservable.add(handleUpdateMetrics)
    sdk.scene.onMeshRemovedObservable.add(handleUpdateMetrics)
    handleUpdateSceneLayout()

    return () => {
      sdk.scene.onDataLoadedObservable.removeCallback(handleUpdateMetrics)
      sdk.scene.onMeshRemovedObservable.removeCallback(handleUpdateMetrics)
    }
  }, [])

  useChange(
    ({ operation, component }) => {
      if (operation === CrdtMessageType.PUT_COMPONENT && component?.componentId === sdk.components.Scene.componentId) {
        handleUpdateSceneLayout()
      }
    },
    [handleUpdateSceneLayout]
  )

  const limits = useMemo<Metrics>(() => {
    const parcels = sceneLayout.parcels.length
    return getSceneLimits(parcels)
  }, [sceneLayout])

  const limitsExceeded = useMemo<Record<string, boolean>>(() => {
    return Object.fromEntries(
      Object.entries(metrics)
        .map(([key, value]) => [key, value > limits[key as keyof Metrics]])
        .filter(([, value]) => value)
    )
  }, [metrics, limits])

  const handleToggleMetricsOverlay = useCallback(
    (e: React.MouseEvent<HTMLButtonElement> | MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setShowMetrics((value) => !value)
    },
    [showMetrics, setShowMetrics]
  )

  const overlayRef = useOutsideClick(handleToggleMetricsOverlay)

  return (
    <div className="Metrics">
      <div className="Buttons">
        <Button
          className={cx({ Active: showMetrics, LimitExceeded: Object.values(limitsExceeded).length > 0 })}
          onClick={handleToggleMetricsOverlay}
        >
          <SquaresGridIcon size={ICON_SIZE} />
        </Button>
      </div>
      {Object.values(limitsExceeded).length > 0 && (
        <div className="LimitExceeded">
          <AlertIcon />
          Too many {Object.keys(limitsExceeded)[0].toUpperCase()}
        </div>
      )}
      {showMetrics && (
        <div ref={overlayRef} className="Overlay">
          <h2 className="Header">
            {sceneLayout.parcels.length} Parcels
            <span className="secondary">
              {sceneLayout.parcels.length * PARCEL_SIZE}m<sup>2</sup>
            </span>
          </h2>
          <div className="Items">
            {Object.entries(metrics).map(([key, value]) => (
              <div className="Item" key={key}>
                <div className="Title">{key.toUpperCase()}</div>
                <div className={cx('Description', { LimitExceeded: limitsExceeded[key] })}>
                  <span className="primary">{value}</span>
                  {'/'}
                  <span className="secondary">{limits[key as keyof Metrics]}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
})

export default React.memo(Metrics)
