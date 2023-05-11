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
import { ToolbarButton } from '../ToolbarButton'
import { Snap } from './Snap'

import './Gizmos.css'
import { useGizmoAlignment } from '../../../hooks/editor/useGizmoAlignment'

export const Gizmos = withSdk(({ sdk }) => {
  const [showPanel, setShowPanel] = useState(false)
  const { isEnabled, toggle } = useSnapToggle()

  const handleClosePanel = useCallback(() => setShowPanel(false), [])
  const handleTogglePanel = useCallback(() => setShowPanel(!showPanel), [showPanel])

  const entity = useSelectedEntity()

  const [selection, setSelection] = useComponentValue(entity || ROOT, sdk.components.Selection)

  const handlePositionGizmo = useCallback(() => setSelection({ gizmo: GizmoType.POSITION }), [setSelection])
  const handleRotationGizmo = useCallback(() => setSelection({ gizmo: GizmoType.ROTATION }), [setSelection])
  const handleScaleGizmo = useCallback(() => setSelection({ gizmo: GizmoType.SCALE }), [setSelection])

  const {
    isPositionGizmoWorldAligned,
    isRotationGizmoWorldAligned,
    setPositionGizmoWorldAligned,
    setRotationGizmoWorldAligned,
    isRotationGizmoAlignmentDisabled
  } = useGizmoAlignment()

  const disableGizmos = !entity

  const SnapToggleIcon = isEnabled ? BiCheckboxChecked : BiCheckbox
  const PositionAlignmentIcon = isPositionGizmoWorldAligned ? BiCheckboxChecked : BiCheckbox
  const RotationAlignmentIcon = isRotationGizmoWorldAligned ? BiCheckboxChecked : BiCheckbox

  const ref = useOutsideClick(handleClosePanel)

  return (
    <div className="Gizmos">
      <ToolbarButton
        className={cx('gizmo position', { active: selection?.gizmo === GizmoType.POSITION })}
        disabled={disableGizmos}
        onClick={handlePositionGizmo}
      />
      <ToolbarButton
        className={cx('gizmo rotation', { active: selection?.gizmo === GizmoType.ROTATION })}
        disabled={disableGizmos}
        onClick={handleRotationGizmo}
      />
      <ToolbarButton
        className={cx('gizmo scale', { active: selection?.gizmo === GizmoType.SCALE })}
        disabled={disableGizmos}
        onClick={handleScaleGizmo}
      />
      <BsCaretDown className="open-panel" onClick={handleTogglePanel} />
      <div ref={ref} className={cx('panel', { visible: true })}>
        <div className="title">
          <label>Snap</label>
          <SnapToggleIcon className="icon" onClick={toggle} />
        </div>
        <div className="snaps">
          <Snap gizmo={GizmoType.POSITION} />
          <Snap gizmo={GizmoType.ROTATION} />
          <Snap gizmo={GizmoType.SCALE} />
        </div>
        <div className="title">
          <label>Align to world</label>
        </div>
        <div className="alignment">
          <label>Position</label>
          <PositionAlignmentIcon
            className="icon"
            onClick={() => setPositionGizmoWorldAligned(!isPositionGizmoWorldAligned)}
          />
        </div>
        <div className={cx('alignment', { disabled: isRotationGizmoAlignmentDisabled })}>
          <label>Rotation</label>
          <RotationAlignmentIcon
            className="icon"
            onClick={() => setRotationGizmoWorldAligned(!isRotationGizmoWorldAligned)}
          />
        </div>
      </div>
    </div>
  )
})

export default React.memo(Gizmos)
