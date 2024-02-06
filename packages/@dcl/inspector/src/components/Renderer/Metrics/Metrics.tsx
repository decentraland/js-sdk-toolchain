import React, { useCallback, useEffect, useMemo } from 'react'
import cx from 'classnames'
import { IoGridOutline as SquaresGridIcon, IoAlertCircleOutline as AlertIcon } from 'react-icons/io5'

import { withSdk, WithSdkProps } from '../../../hoc/withSdk'
import { useChange } from '../../../hooks/sdk/useChange'
import { useOutsideClick } from '../../../hooks/useOutsideClick'
import { Button } from '../../Button'
import { getSceneLimits } from './utils'
import type { Metrics } from './types'

import './Metrics.css'

const ICON_SIZE = 18

const Metrics = withSdk<WithSdkProps>(({ sdk }) => {
  const [showMetrics, setShowMetrics] = React.useState(false)
  const [metrics, setMetrics] = React.useState<Partial<Metrics>>({
    triangles: 0,
    entities: 0,
    bodies: 0,
    materials: 0,
    textures: 0
  })

  const handleUpdateMetrics = useCallback(() => {
    const ROOT_ENGINE = sdk.engine.RootEntity
    const triangles = sdk.scene.meshes.reduce((acc, mesh) => acc + mesh.getTotalVertices(), 0)
    const entities = (sdk.components.Nodes.getOrNull(ROOT_ENGINE)?.value ?? [ROOT_ENGINE]).length - 1
    setMetrics({
      triangles: triangles,
      entities: entities,
      bodies: sdk.scene.meshes.length,
      materials: sdk.scene.materials.length,
      textures: sdk.scene.textures.length
    })
  }, [sdk])

  useEffect(handleUpdateMetrics, [handleUpdateMetrics])

  useChange(handleUpdateMetrics, [handleUpdateMetrics])

  const scene = useMemo(() => {
    return sdk.components.Scene.get(sdk.engine.RootEntity)
  }, [sdk])

  const limits = useMemo<Metrics>(() => {
    const parcels = scene.layout.base.x * scene.layout.base.y
    return getSceneLimits(parcels)
  }, [scene])

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
            {scene.layout.base.x}x{scene.layout.base.y} LAND
            <span className="secondary">
              {scene.layout.base.x * 16}x{scene.layout.base.y * 16}m
            </span>
          </h2>
          <div className="Items">
            {Object.entries(metrics).map(([key, value]) => (
              <div className="Item" key={key}>
                <div className="Title">{key.toUpperCase()}</div>
                <div className={cx('Description', { LimitExceeded: limitsExceeded[key] })}>
                  <span className="primary">{value}</span>/
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
