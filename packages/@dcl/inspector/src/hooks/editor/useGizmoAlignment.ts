import { useCallback, useEffect, useRef, useState } from 'react'
import { CrdtMessageType } from '@dcl/ecs'
import { useSdk } from '../sdk/useSdk'
import { useChange } from '../sdk/useChange'
import { Gizmos } from '../../lib/babylon/decentraland/gizmo-manager'

export const useGizmoAlignment = () => {
  const gizmosRef = useRef<Gizmos | null>(null)
  const [isPositionGizmoWorldAligned, setPositionGizmoWorldAligned] = useState(false)
  const [isPositionGizmoAlignmentDisabled, setIsPositionGizmoAlignmentDisabled] = useState(false)
  const [isRotationGizmoWorldAligned, setRotationGizmoWorldAligned] = useState(false)
  const [isRotationGizmoAlignmentDisabled, setIsRotationGizmoAlignmentDisabled] = useState(false)

  // update rotation gizmo alignment only if is not disabled
  const safeSetRotationGizmoWorldAligned = useCallback(
    (value: boolean) => {
      if (!isRotationGizmoAlignmentDisabled) {
        setRotationGizmoWorldAligned(value)
      }
    },
    [isRotationGizmoAlignmentDisabled]
  )

  // update position gizmo alignment only if is not disabled
  const safeSetPositionGizmoWorldAligned = useCallback(
    (value: boolean) => {
      if (!isPositionGizmoAlignmentDisabled) {
        setPositionGizmoWorldAligned(value)
      }
    },
    [isPositionGizmoAlignmentDisabled]
  )

  // sync from renderer to hook state
  const updateState = useCallback(() => {
    if (gizmosRef.current) {
      const gizmos = gizmosRef.current
      if (isPositionGizmoWorldAligned !== gizmos.isPositionGizmoWorldAligned()) {
        setPositionGizmoWorldAligned(gizmos.isPositionGizmoWorldAligned())
      }
      if (isRotationGizmoWorldAligned !== gizmos.isRotationGizmoWorldAligned()) {
        setRotationGizmoWorldAligned(gizmos.isRotationGizmoWorldAligned())
      }
      if (isRotationGizmoAlignmentDisabled !== gizmos.isRotationGizmoAlignmentDisabled()) {
        setIsRotationGizmoAlignmentDisabled(gizmos.isRotationGizmoAlignmentDisabled())
      }
      if (isPositionGizmoAlignmentDisabled !== gizmos.isPositionGizmoAlignmentDisabled()) {
        setIsPositionGizmoAlignmentDisabled(gizmos.isPositionGizmoAlignmentDisabled())
      }
    }
  }, [
    isPositionGizmoWorldAligned,
    isRotationGizmoWorldAligned,
    isRotationGizmoAlignmentDisabled,
    isPositionGizmoAlignmentDisabled
  ])

  // listen to changes in the engine, fix the rotation gizmo alignment if necessary
  useChange((event, sdk) => {
    if (gizmosRef.current) {
      const gizmos = gizmosRef.current
      const currentEntity = gizmos.getEntity()
      const isSelectedEntity = currentEntity?.entityId === event.entity
      const isTransformComponent = event.component?.componentId === sdk.components.Transform.componentId
      const isDeleteOperation = event.operation === CrdtMessageType.DELETE_COMPONENT
      if (isSelectedEntity && isTransformComponent && !isDeleteOperation) {
        gizmos.fixRotationGizmoAlignment(event.value)
        gizmos.fixPositionGizmoAlignment(event.value)
      }
    }
  }, [])

  // sync from hook state to renderer
  const updateRenderer = useCallback(() => {
    if (gizmosRef.current) {
      const gizmos = gizmosRef.current
      if (gizmos.isPositionGizmoWorldAligned() !== isPositionGizmoWorldAligned) {
        gizmos.setPositionGizmoWorldAligned(isPositionGizmoWorldAligned)
      }
      if (gizmos.isRotationGizmoWorldAligned() !== isRotationGizmoWorldAligned) {
        gizmos.setRotationGizmoWorldAligned(isRotationGizmoWorldAligned)
      }
    }
  }, [isPositionGizmoWorldAligned, isRotationGizmoWorldAligned])

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
    isPositionGizmoWorldAligned,
    isRotationGizmoWorldAligned,
    setPositionGizmoWorldAligned: safeSetPositionGizmoWorldAligned,
    setRotationGizmoWorldAligned: safeSetRotationGizmoWorldAligned,
    isRotationGizmoAlignmentDisabled,
    isPositionGizmoAlignmentDisabled
  }
}
