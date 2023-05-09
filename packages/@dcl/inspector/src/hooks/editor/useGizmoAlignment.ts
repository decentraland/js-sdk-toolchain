import { useEffect, useRef, useState } from 'react'
import { getGizmoManager } from '../../lib/babylon/decentraland/gizmo-manager'
import { useSdk } from '../sdk/useSdk'

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

  useSdk(({ scene }) => {
    const gm = getGizmoManager(scene)
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
