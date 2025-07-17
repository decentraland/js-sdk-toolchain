import React, { useCallback, useEffect, useMemo } from 'react'
import cx from 'classnames'
import { IoGridOutline as SquaresGridIcon } from 'react-icons/io5'
import { FiAlertTriangle as WarningIcon } from 'react-icons/fi'

import { Material } from '@babylonjs/core'
import { CrdtMessageType } from '@dcl/ecs'

import { withSdk, WithSdkProps } from '../../../hoc/withSdk'
import { useChange } from '../../../hooks/sdk/useChange'
import { useOutsideClick } from '../../../hooks/useOutsideClick'
import { useAppDispatch, useAppSelector } from '../../../redux/hooks'
import {
  getMetrics,
  getLimits,
  getEntitiesOutOfBoundaries,
  setEntitiesOutOfBoundaries,
  setMetrics,
  setLimits
} from '../../../redux/scene-metrics'
import { SceneMetrics } from '../../../redux/scene-metrics/types'
import type { Layout } from '../../../lib/utils/layout'
import { GROUND_MESH_PREFIX, PARCEL_SIZE } from '../../../lib/utils/scene'
import { getLayoutManager } from '../../../lib/babylon/decentraland/layout-manager'
import { Button } from '../../Button'
import { getSceneLimits } from './utils'

import './Metrics.css'

const ICON_SIZE = 18
const IGNORE_MATERIALS = [
  // Babylon default materials
  'BackgroundSkyboxMaterial',
  'BackgroundPlaneMaterial',
  'colorShader',
  'colorShaderOccQuery',
  'skyBox',
  // Utils Materials
  'entity_outside_layout',
  'entity_outside_layout_multimaterial',
  'layout_grid',
  'grid',
  'base-box',
  'collider-material',
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
  const PLAYER_ROOT = sdk.engine.PlayerEntity
  const CAMERA_ROOT = sdk.engine.CameraEntity
  const dispatch = useAppDispatch()
  const metrics = useAppSelector(getMetrics)
  const limits = useAppSelector(getLimits)
  const entitiesOutOfBoundaries = useAppSelector(getEntitiesOutOfBoundaries)
  const [showMetrics, setShowMetrics] = React.useState(false)
  const [sceneLayout, setSceneLayout] = React.useState<Layout>({
    base: { x: 0, y: 0 },
    parcels: []
  })

  const getNodes = useCallback(
    () =>
      sdk.components.Nodes.getOrNull(ROOT)?.value.filter(
        (node) => ![ROOT, PLAYER_ROOT, CAMERA_ROOT].includes(node.entity)
      ) ?? [],
    [sdk]
  )

  const handleUpdateMetrics = useCallback(() => {
    const meshes = sdk.scene.meshes.filter(
      (mesh) =>
        !IGNORE_MESHES.includes(mesh.id) &&
        !mesh.id.startsWith(GROUND_MESH_PREFIX) &&
        !mesh.id.startsWith('BoundingMesh')
    )
    const triangles = meshes.reduce((acc, mesh) => acc + mesh.getTotalVertices(), 0)
    const uniqueTextures = new Set(
      sdk.scene.textures
        .filter((texture) => !IGNORE_TEXTURES.includes(texture.name))
        .map((texture) => texture.getInternalTexture()!.uniqueId)
    )
    const uniqueMaterials = new Set(
      sdk.scene.materials.map((material) => material.id).filter((id) => !IGNORE_MATERIALS.includes(id))
    )

    dispatch(
      setMetrics({
        triangles,
        entities: getNodes().length,
        bodies: meshes.length,
        materials: uniqueMaterials.size,
        textures: uniqueTextures.size
      })
    )
  }, [sdk, dispatch, getNodes, setMetrics])

  const handleUpdateSceneLayout = useCallback(() => {
    const scene = sdk.components.Scene.getOrNull(ROOT)
    if (scene) {
      setSceneLayout(scene.layout as Layout)
      dispatch(setLimits(getSceneLimits(scene.layout.parcels.length)))
    }
  }, [sdk, setSceneLayout])

  const handleSceneChange = useCallback(() => {
    const nodes = getNodes()
    const { isEntityOutsideLayout } = getLayoutManager(sdk.scene)

    console.log('Total nodes:', nodes.length)
    console.log('Layout manager:', !!isEntityOutsideLayout)

    const entitiesOutOfBoundaries = nodes.reduce((count, node) => {
      const entity = sdk.sceneContext.getEntityOrNull(node.entity)
      console.log(`Entity ${node.entity}:`, {
        hasEntity: !!entity,
        hasBoundingMesh: !!entity?.boundingInfoMesh,
        isOutOfBoundaries: entity?.isOutOfBoundaries()
      })

      if (entity && entity.boundingInfoMesh) {
        const isOutside = isEntityOutsideLayout(entity.boundingInfoMesh)
        console.log(`Entity ${node.entity} isOutside:`, isOutside)
        return isOutside ? count + 1 : count
      }
      return count
    }, 0)

    console.log('Final count:', entitiesOutOfBoundaries)
    dispatch(setEntitiesOutOfBoundaries(entitiesOutOfBoundaries))
  }, [sdk, dispatch, getNodes, setEntitiesOutOfBoundaries])

  useEffect(() => {
    sdk.scene.onDataLoadedObservable.add(handleUpdateMetrics)
    sdk.scene.onMeshRemovedObservable.add(handleUpdateMetrics)
    sdk.scene.onNewMeshAddedObservable.add(handleSceneChange)
    sdk.scene.onMeshRemovedObservable.add(handleSceneChange)

    handleUpdateSceneLayout()

    return () => {
      sdk.scene.onDataLoadedObservable.removeCallback(handleUpdateMetrics)
      sdk.scene.onMeshRemovedObservable.removeCallback(handleUpdateMetrics)
      sdk.scene.onNewMeshAddedObservable.removeCallback(handleSceneChange)
      sdk.scene.onMeshRemovedObservable.removeCallback(handleSceneChange)
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

  const limitsExceeded = useMemo<Record<string, boolean>>(() => {
    debugger
    return Object.fromEntries(
      Object.entries(metrics)
        .map(([key, value]) => [key, value > limits[key as keyof SceneMetrics]])
        .filter(([, value]) => value)
    )
  }, [metrics, limits])

  const isAnyLimitExceeded = (limitsExceeded: Record<string, any>): boolean => {
    return Object.values(limitsExceeded).length > 0 || entitiesOutOfBoundaries > 0
  }

  const handleToggleMetricsOverlay = useCallback(
    (e: React.MouseEvent<HTMLButtonElement> | MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setShowMetrics((value) => !value)
    },
    [showMetrics, setShowMetrics]
  )

  const overlayRef = useOutsideClick(handleToggleMetricsOverlay)

  const getWarningMessages = (): string[] => {
    const baseMessage = 'Your scene contains too many'
    const warnings: string[] = []

    Object.entries(limitsExceeded).forEach(([key, isExceeded]) => {
      if (isExceeded) {
        warnings.push(`${baseMessage} ${key}`)
      }
    })

    if (entitiesOutOfBoundaries > 0) {
      warnings.push(
        `${entitiesOutOfBoundaries} entit${
          entitiesOutOfBoundaries === 1 ? 'y is' : 'ies are'
        } out of bounds and may not display correctly in-world.`
      )
    }

    return warnings
  }

  const warningMessages = getWarningMessages()

  return (
    <div className="Metrics">
      <div className="Buttons">
        <Button
          className={cx({ Active: showMetrics, LimitExceeded: isAnyLimitExceeded(limitsExceeded) })}
          onClick={handleToggleMetricsOverlay}
        >
          <SquaresGridIcon size={ICON_SIZE} />
        </Button>
      </div>
      {showMetrics && (
        <div ref={overlayRef} className="Overlay">
          <h2 className="Header">Scene Optimization</h2>
          <div className="Description">Suggested Specs per Parcel</div>
          <div className="Description">
            {sceneLayout.parcels.length} Parcels = {sceneLayout.parcels.length * PARCEL_SIZE}
            <div>
              m<sup>2</sup>
            </div>
          </div>
          <div className="Items">
            {Object.entries(metrics).map(([key, value]) => (
              <div className="Item" key={key}>
                <div className="Title">{key.toUpperCase()}</div>
                <div className={cx('Description', { LimitExceeded: limitsExceeded[key] })}>
                  <span className="primary">{value}</span>
                  {'/'}
                  <span className="secondary">{limits[key as keyof SceneMetrics]}</span>
                </div>
              </div>
            ))}
          </div>
          {warningMessages.length > 0 && (
            <div className="WarningsContainer">
              <div className="Description">WARNINGS</div>
              {warningMessages.map((message, index) => (
                <div className="WarningItem" key={index}>
                  <WarningIcon className="WarningIcon" />
                  <span className="WarningText">{message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
})

export default React.memo(Metrics)
