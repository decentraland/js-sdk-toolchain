import { useCallback, useEffect, useRef, useState } from 'react'
import { useSdk } from '../sdk/useSdk'
import { Gizmos } from '../../lib/babylon/decentraland/GizmoManager'

export const useGizmoAlignment = () => {
  const gizmosRef = useRef<Gizmos | null>(null)
  const [isGizmoWorldAligned, setGizmoWorldAligned] = useState(false)
  const [isGizmoWorldAlignmentDisabled, setGizmoWorldAlignmentDisabled] = useState(false)

  // update world gizmo alignment only if is not disabled
  const safeSetGizmoWorldAligned = useCallback(
    (value: boolean) => {
      if (!isGizmoWorldAlignmentDisabled) {
        setGizmoWorldAligned(value)
      }
    },
    [isGizmoWorldAligned]
  )

  // sync from renderer to hook state
  const updateState = useCallback(() => {
    if (gizmosRef.current) {
      const gizmos = gizmosRef.current
      if (isGizmoWorldAligned !== gizmos.isGizmoWorldAligned()) {
        setGizmoWorldAligned(gizmos.isGizmoWorldAligned())
      }
      if (isGizmoWorldAlignmentDisabled !== gizmos.isGizmoWorldAlignmentDisabled()) {
        setGizmoWorldAlignmentDisabled(gizmos.isGizmoWorldAlignmentDisabled())
      }
    }
  }, [isGizmoWorldAligned, isGizmoWorldAlignmentDisabled])

  // sync from hook state to renderer
  const updateRenderer = useCallback(() => {
    if (gizmosRef.current) {
      const gizmos = gizmosRef.current
      if (gizmos.isGizmoWorldAligned() !== isGizmoWorldAligned) {
        gizmos.setGizmoWorldAligned(isGizmoWorldAligned)
      }
    }
  }, [isGizmoWorldAligned])

  // bind changes on renderer to update hook state
  useSdk(
    ({ gizmos }) => {
      if (!gizmosRef.current) {
        gizmosRef.current = gizmos
        updateState()
      }
      return gizmos.onChange(updateState)
    },
    [updateState]
  )

  // bind changes in hook state to update renderer
  useEffect(() => {
    updateRenderer()
  }, [updateRenderer])

  return {
    isGizmoWorldAligned,
    isGizmoWorldAlignmentDisabled,
    setGizmoWorldAligned: safeSetGizmoWorldAligned
  }
}
