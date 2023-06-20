import React from 'react'
import { Warning } from '../Warning'
import { useGizmoAlignment } from '../../../hooks/editor/useGizmoAlignment'
import { useSelectedEntity } from '../../../hooks/sdk/useSelectedEntity'
import { ROOT } from '../../../lib/sdk/tree'
import { withSdk } from '../../../hoc/withSdk'
import { useComponentValue } from '../../../hooks/sdk/useComponentValue'
import { GizmoType } from '../../../lib/utils/gizmo'

const RotationGizmoLocalAlignmentDisabled: React.FC = withSdk(({ sdk }) => {
  const selectedEntity = useSelectedEntity()
  const [selection] = useComponentValue(selectedEntity || ROOT, sdk.components.Selection)
  const { isRotationGizmoAlignmentDisabled } = useGizmoAlignment()
  if (selectedEntity && selection.gizmo === GizmoType.ROTATION && isRotationGizmoAlignmentDisabled) {
    return (
      <Warning
        title={
          <span>
            The <b>rotation gizmo</b> can't be aligned to the entity when it's not scaled proportionally
          </span>
        }
      />
    )
  } else {
    return null
  }
})

export default React.memo(RotationGizmoLocalAlignmentDisabled)
