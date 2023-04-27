import { useCallback, useEffect, useState } from 'react'
import { snapManager } from '../../lib/babylon/decentraland/snap-manager'
import { GizmoType } from '../../lib/utils/gizmo'

function getSnapValue(gizmo: GizmoType) {
  switch (gizmo) {
    case GizmoType.TRANSLATE:
      return snapManager.getPositionSnap()
    case GizmoType.ROTATE:
      return Math.round(snapManager.getRotationSnap() * (180 / Math.PI))
    case GizmoType.SCALE:
      return snapManager.getScaleSnap()
  }
}

function setSnapValue(value: number, gizmo: GizmoType) {
  console.log('set snap', value, gizmo)
  switch (gizmo) {
    case GizmoType.TRANSLATE:
      return snapManager.setPositionSnap(value)
    case GizmoType.ROTATE:
      return snapManager.setRotationSnap(value * (Math.PI / 180))
    case GizmoType.SCALE:
      return snapManager.setScaleSnap(value)
  }
}

export const useSnapState = (gizmo: GizmoType) => {
  const [snap, setSnapInternal] = useState<string>(getSnapValue(gizmo).toString())
  // TODO: useRef, avoid re-renders
  const [skipSync, setSkipSync] = useState<boolean>(false)
  const setSnap = useCallback((value: string, skipSync = false) => {
    setSkipSync(skipSync)
    setSnapInternal(value)
  }, [])

  // send update to snap manager
  useEffect(() => {
    if (skipSync) return
    const current = getSnapValue(gizmo)
    const numeric = Number(snap)
    if (snap === '' || isNaN(numeric) || numeric === current || numeric < 0) return
    console.log('update snap')
    setSnapValue(numeric, gizmo)
  }, [snap])

  // receive update from snap manager
  useEffect(() => {
    const unsuscribe = snapManager.onChange(() => {
      console.log()
      const value = getSnapValue(gizmo).toString()
      if (value === snap) return
      console.log('snap changed')
      setSnap(value, true) // skip sync to avoid endless loop
    })
    return () => unsuscribe()
  }, [])

  return [snap, setSnap] as const
}

export const useSnapToggle = () => {
  const [isEnabled, setEnabledInternal] = useState<boolean>(snapManager.isEnabled())
  const [skipSync, setSkipSync] = useState<boolean>(false)
  const setEnabled = useCallback((value: boolean, skipSync = false) => {
    setSkipSync(skipSync)
    setEnabledInternal(value)
  }, [])
  const toggle = useCallback(() => setEnabled(!isEnabled), [isEnabled])

  // send update to snap manager
  useEffect(() => {
    if (skipSync) return
    snapManager.setEnabled(isEnabled)
  }, [isEnabled])

  // receive update from snap manager
  useEffect(() => {
    const unsuscribe = snapManager.onChange(() => {
      setEnabled(snapManager.isEnabled(), true) // skip sync to avoid endless loop
    })
    return () => unsuscribe()
  }, [])

  return { isEnabled, setEnabled, toggle }
}
