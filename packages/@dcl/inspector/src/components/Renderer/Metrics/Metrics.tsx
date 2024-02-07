import React, { useCallback, useEffect, useMemo } from 'react'
import cx from 'classnames'
import { IoGridOutline as SquaresGridIcon, IoAlertCircleOutline as AlertIcon } from 'react-icons/io5'
import { CrdtMessageType } from '@dcl/ecs'

import { withSdk, WithSdkProps } from '../../../hoc/withSdk'
import { useChange } from '../../../hooks/sdk/useChange'
import { useOutsideClick } from '../../../hooks/useOutsideClick'
import type { Layout } from '../../../lib/utils/layout'
import { Button } from '../../Button'
import { getSceneLimits } from './utils'
import type { Metrics } from './types'

import './Metrics.css'

const ICON_SIZE = 18
const PARCEL_SIZE = 16

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
    const triangles = sdk.scene.meshes.reduce((acc, mesh) => acc + mesh.getTotalVertices(), 0)
    const entities = (sdk.components.Nodes.getOrNull(ROOT)?.value ?? [ROOT]).length - 1
    const uniqueTextures = new Set(sdk.scene.textures.map((texture) => texture.getInternalTexture()!.uniqueId))
    const uniqueMaterials = new Set(sdk.scene.materials.map((material) => material.id))
    setMetrics({
      triangles: triangles,
      entities: entities,
      bodies: sdk.scene.meshes.length,
      materials: uniqueTextures.size,
      textures: uniqueMaterials.size
    })
  }, [sdk])

  const handleUpdateSceneLayout = useCallback(() => {
    const scene = sdk.components.Scene.get(ROOT)
    setSceneLayout({ ...(scene.layout as Layout) })
  }, [sdk, setSceneLayout])

  useEffect(() => {
    handleUpdateMetrics()
    handleUpdateSceneLayout()
  }, [])

  useChange(
    ({ operation, component }) => {
      if (operation === CrdtMessageType.PUT_COMPONENT) {
        if (component?.componentId === sdk.components.Nodes.componentId) {
          handleUpdateMetrics()
        } else if (component?.componentId === sdk.components.Scene.componentId) {
          handleUpdateSceneLayout()
        }
      }
    },
    [handleUpdateMetrics, handleUpdateSceneLayout]
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