import React from 'react'
import { useGizmoAlignment } from '../../../hooks/editor/useGizmoAlignment'
import { useSelectedEntity } from '../../../hooks/sdk/useSelectedEntity'
import { ROOT } from '../../../lib/sdk/tree'
import { withSdk } from '../../../hoc/withSdk'
import { useComponentValue } from '../../../hooks/sdk/useComponentValue'
import { GizmoType } from '../../../lib/utils/gizmo'
import { Warning } from '../Warning'

const MultiSelectEntities: React.FC = withSdk(({ sdk }) => {
  const selectedEntity = useSelectedEntity()
  const [selection] = useComponentValue(selectedEntity || ROOT, sdk.components.Selection)
  const { isPositionGizmoAlignmentDisabled } = useGizmoAlignment()
  const areMultipleEntitiesSelected = sdk.operations.getSelectedEntities().length > 1
  if (
    selectedEntity &&
    selection.gizmo === GizmoType.POSITION &&
    isPositionGizmoAlignmentDisabled &&
    areMultipleEntitiesSelected
  ) {
    return (
      <Warning
        title={
          <span>
            Some entities are not scaled proportionally, which can lead to unexpected problems when transforming them.
          </span>
        }
      />
    )
  } else {
    return null
  }
})

export default React.memo(MultiSelectEntities)
