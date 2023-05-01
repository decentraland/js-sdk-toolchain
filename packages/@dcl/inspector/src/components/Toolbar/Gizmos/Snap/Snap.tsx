import React, { useCallback } from 'react'
import cx from 'classnames'
import { GizmoType } from '../../../../lib/sdk/operations/update-selected-entity'
import { useSnapState, useSnapToggle } from '../../../../hooks/editor/useSnap'
import './Snap.css'

type Props = {
  gizmo: GizmoType
}

const Snap: React.FC<Props> = ({ gizmo }) => {
  const [snap, setSnap] = useSnapState(gizmo)
  const { isEnabled } = useSnapToggle()

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
    case GizmoType.TRANSLATE:
      label = 'Position'
      break
    case GizmoType.ROTATE:
      label = 'Rotation'
      break
    case GizmoType.SCALE:
      label = 'Scale'
      break
  }

  return (
    <div className={cx('Snap', { disabled: !isEnabled })}>
      <div className="label">{label}</div>
      <input type="number" value={snap} onChange={handleChange} onBlur={handleBlur} disabled={!isEnabled} />
    </div>
  )
}

export default React.memo(Snap)
