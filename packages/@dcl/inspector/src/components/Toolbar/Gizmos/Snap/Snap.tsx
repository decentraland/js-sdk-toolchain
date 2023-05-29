import React, { useCallback } from 'react'

import { useSnapState } from '../../../../hooks/editor/useSnap'
import { GizmoType } from '../../../../lib/utils/gizmo'

import './Snap.css'

type Props = {
  gizmo: GizmoType
}

const Snap: React.FC<Props> = ({ gizmo }) => {
  const [snap, setSnap] = useSnapState(gizmo)

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSnap(e.target.value)
    },
    [setSnap]
  )

  const handleBlur = useCallback(() => {
    const numeric = Number(snap)
    if (numeric < 0 || isNaN(numeric)) {
      setSnap('0')
    } else {
      setSnap(numeric.toString())
    }
  }, [snap, setSnap])

  let label = ''
  switch (gizmo) {
    case GizmoType.POSITION:
      label = 'Position'
      break
    case GizmoType.ROTATION:
      label = 'Rotation'
      break
    case GizmoType.SCALE:
      label = 'Scale'
      break
  }

  return (
    <div className="Snap">
      <div className="label">{label}</div>
      <input type="number" value={snap} onChange={handleChange} onBlur={handleBlur} />
    </div>
  )
}

export default React.memo(Snap)
