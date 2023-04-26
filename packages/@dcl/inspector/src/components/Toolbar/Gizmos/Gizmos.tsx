import React, { useCallback } from 'react'
import cx from 'classnames'
import { withSdk } from '../../../hoc/withSdk'
import { useComponentValue } from '../../../hooks/sdk/useComponentValue'
import { useSelectedEntity } from '../../../hooks/sdk/useSelectedEntity'
import { ROOT } from '../../../lib/sdk/tree'
import { GizmoType } from '../../../lib/utils/gizmo'
import { Button } from '../Button'
import './Gizmos.css'

export const Gizmos = withSdk(({ sdk }) => {
  const entity = useSelectedEntity()

  const [selection, setSelection] = useComponentValue(entity || ROOT, sdk.components.Selection)

  const handleTranslateGizmo = useCallback(() => setSelection({ gizmo: GizmoType.TRANSLATE }), [setSelection])
  const handleRotateGizmo = useCallback(() => setSelection({ gizmo: GizmoType.ROTATE }), [setSelection])
  const handleScaleGizmo = useCallback(() => setSelection({ gizmo: GizmoType.SCALE }), [setSelection])

  const disableGizmos = !entity

  return (
    <div className="Gizmos">
      <Button
        className={cx('gizmo translate', { active: selection?.gizmo === GizmoType.TRANSLATE })}
        disabled={disableGizmos}
        onClick={handleTranslateGizmo}
      />
      <Button
        className={cx('gizmo rotate', { active: selection?.gizmo === GizmoType.ROTATE })}
        disabled={disableGizmos}
        onClick={handleRotateGizmo}
      />
      <Button
        className={cx('gizmo scale', { active: selection?.gizmo === GizmoType.SCALE })}
        disabled={disableGizmos}
        onClick={handleScaleGizmo}
      />
    </div>
  )
})

export default React.memo(Gizmos)
