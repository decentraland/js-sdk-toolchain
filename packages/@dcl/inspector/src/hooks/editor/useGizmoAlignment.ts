import { useEffect, useRef, useState } from 'react'
import { getGizmoManager } from '../../lib/babylon/decentraland/gizmo-manager'
import { useSdk } from '../sdk/useSdk'
import { useChange } from '../sdk/useChange'

export const useGizmoAlignment = () => {
  const gizmoManagerRef = useRef<ReturnType<typeof getGizmoManager> | null>(null)
  const [isPositionGizmoWorldAligned, setPositionGizmoWorldAligned] = useState(false)
  const [isRotationGizmoWorldAligned, setRotationGizmoWorldAligned] = useState(false)

  const updateState = () => {
    if (gizmoManagerRef.current) {
      const gm = gizmoManagerRef.current
      if (gm.isPositionGizmoWorldAligned() !== isPositionGizmoWorldAligned) {
        setPositionGizmoWorldAligned(gm.isPositionGizmoWorldAligned())
      }
      if (gm.isRotationGizmoWorldAligned() !== isRotationGizmoWorldAligned) {
        setRotationGizmoWorldAligned(gm.isRotationGizmoWorldAligned())
      }
    }
  }

  useChange((event, sdk) => {
    if (gizmoManagerRef.current) {
      const gm = gizmoManagerRef.current
      const currentEntity = gm.getEntity()
      const isSelectedEntity = currentEntity && currentEntity.entityId === event.entity
      const isTransformComponent = event.component?.componentId === sdk.components.Transform.componentId
      if (isSelectedEntity && isTransformComponent) {
        gm.fixRotationGizmoAlignment(event.value)
      }
    }
  })

  const updateRenderer = () => {
    if (gizmoManagerRef.current) {
      const gm = gizmoManagerRef.current
      if (gm.isPositionGizmoWorldAligned() !== isPositionGizmoWorldAligned) {
        gm.setPositionGizmoWorldAligned(isPositionGizmoWorldAligned)
      }
      if (gm.isRotationGizmoWorldAligned() !== isRotationGizmoWorldAligned) {
        gm.setRotationGizmoWorldAligned(isRotationGizmoWorldAligned)
      }
    }
  }

  useSdk(({ scene, operations }) => {
    const gm = getGizmoManager(scene, operations)
    gizmoManagerRef.current = gm
    updateState()
    return gm.onChange(() => {
      updateState()
    })
  })

  useEffect(() => {
    updateRenderer()
  }, [isPositionGizmoWorldAligned, isRotationGizmoWorldAligned])

  return {
    isPositionGizmoWorldAligned,
    isRotationGizmoWorldAligned,
    setPositionGizmoWorldAligned,
    setRotationGizmoWorldAligned
  }
}
