import { useCallback, useEffect, useRef, useState } from 'react'

import { snapManager } from '../../lib/babylon/decentraland/snap-manager'
import { GizmoType } from '../../lib/utils/gizmo'

function getSnapValue(gizmo: GizmoType) {
  switch (gizmo) {
    case GizmoType.POSITION:
    case GizmoType.FREE:
      return snapManager.getPositionSnap()
    case GizmoType.ROTATION:
      return Math.round(snapManager.getRotationSnap() * (180 / Math.PI))
    case GizmoType.SCALE:
      return snapManager.getScaleSnap()
  }
}

function setSnapValue(value: number, gizmo: GizmoType) {
  switch (gizmo) {
    case GizmoType.POSITION:
      return snapManager.setPositionSnap(value)
    case GizmoType.ROTATION:
      return snapManager.setRotationSnap(value * (Math.PI / 180))
    case GizmoType.SCALE:
      return snapManager.setScaleSnap(value)
  }
}

export const useSnapState = (gizmo: GizmoType) => {
  const [snap, setSnapInternal] = useState<string>(getSnapValue(gizmo).toString())
  const skipSyncRef = useRef(false)
  const setSnap = useCallback((value: string, skipSync = false) => {
    skipSyncRef.current = skipSync
    setSnapInternal(value)
  }, [])

  // send update to snap manager
  useEffect(() => {
    if (skipSyncRef.current) return
    const current = getSnapValue(gizmo)
    const numeric = Number(snap)
    if (snap === '' || isNaN(numeric) || numeric === current || numeric < 0) return
    setSnapValue(numeric, gizmo)
  }, [snap])

  // receive update from snap manager
  useEffect(() => {
    const unsubscribe = snapManager.onChange(() => {
      const value = getSnapValue(gizmo).toString()
      if (value === snap) return
      setSnap(value, true) // skip sync to avoid endless loop
    })
    return () => unsubscribe()
  }, [])

  return [snap, setSnap] as const
}

export const useSnapToggle = () => {
  const [isEnabled, setEnabledInternal] = useState<boolean>(snapManager.isEnabled())
  const skipSyncRef = useRef(false)
  const setEnabled = useCallback((value: boolean, skipSync = false) => {
    skipSyncRef.current = skipSync
    setEnabledInternal(value)
  }, [])
  const toggle = useCallback(() => setEnabled(!isEnabled), [isEnabled])

  // send update to snap manager
  useEffect(() => {
    if (skipSyncRef.current) return
    snapManager.setEnabled(isEnabled)
  }, [isEnabled])

  // receive update from snap manager
  useEffect(() => {
    const unsubscribe = snapManager.onChange(() => {
      setEnabled(snapManager.isEnabled(), true) // skip sync to avoid endless loop
    })
    return () => unsubscribe()
  }, [])

  return { isEnabled, setEnabled, toggle }
}
