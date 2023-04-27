import React, { useCallback, useState } from 'react'
import { BsCaretDown } from 'react-icons/bs'
import { BiCheckbox, BiCheckboxChecked } from 'react-icons/bi'
import cx from 'classnames'
import { withSdk } from '../../../hoc/withSdk'
import { useComponentValue } from '../../../hooks/sdk/useComponentValue'
import { useSelectedEntity } from '../../../hooks/sdk/useSelectedEntity'
import { useOutsideClick } from '../../../hooks/useOutsideClick'
import { useSnapToggle } from '../../../hooks/editor/useSnap'
import { ROOT } from '../../../lib/sdk/tree'
import { GizmoType } from '../../../lib/utils/gizmo'
import { Button } from '../Button'
import { Snap } from './Snap'
import './Gizmos.css'

export const Gizmos = withSdk(({ sdk }) => {
  const [showPanel, setShowPanel] = useState(false)
  const { isEnabled, toggle } = useSnapToggle()

  const handleClosePanel = useCallback(() => setShowPanel(false), [])
  const handleTogglePanel = useCallback(() => setShowPanel(!showPanel), [showPanel])

  const entity = useSelectedEntity()

  const [selection, setSelection] = useComponentValue(entity || ROOT, sdk.components.Selection)

  const handleTranslateGizmo = useCallback(() => setSelection({ gizmo: GizmoType.TRANSLATE }), [setSelection])
  const handleRotateGizmo = useCallback(() => setSelection({ gizmo: GizmoType.ROTATE }), [setSelection])
  const handleScaleGizmo = useCallback(() => setSelection({ gizmo: GizmoType.SCALE }), [setSelection])

  const disableGizmos = !entity

  const SnapToggleIcon = isEnabled ? BiCheckboxChecked : BiCheckbox

  const ref = useOutsideClick(handleClosePanel)

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
      <BsCaretDown className="open-panel" onClick={handleTogglePanel} />
      <div ref={ref} className={cx('panel', { visible: showPanel })}>
        <div className="title">
          <label>Snap</label>
          <SnapToggleIcon className="icon" onClick={toggle} />
        </div>
        <Snap gizmo={GizmoType.TRANSLATE} />
        <Snap gizmo={GizmoType.ROTATE} />
        <Snap gizmo={GizmoType.SCALE} />
      </div>
    </div>
  )
})

export default React.memo(Gizmos)
