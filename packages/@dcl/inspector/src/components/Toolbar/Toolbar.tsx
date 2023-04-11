import { useCallback } from 'react'
import { BiUndo, BiRedo } from 'react-icons/bi'
import classNames from 'classnames'
import { withSdk } from '../../hoc/withSdk'
import { useSelectedEntity } from '../../hooks/sdk/useSelectedEntity'
import { useComponentValue } from '../../hooks/sdk/useComponentValue'
import { GizmoType } from '../../lib/utils/gizmo'
import { ROOT } from '../../lib/sdk/tree'
import './Toolbar.css'

const Toolbar = withSdk(({ sdk }) => {
  const entity = useSelectedEntity()

  const [selectedEntityValue, setSelectedEntityValue] = useComponentValue(entity || ROOT, sdk.components.Selection)

  const disableGizmos = !selectedEntityValue

  const handleInspector = useCallback(() => {
    if (!sdk) return
    const { debugLayer } = sdk.scene
    if (debugLayer.isVisible()) {
      debugLayer.hide()
    } else {
      void debugLayer.show({ showExplorer: true, embedMode: true })
    }
  }, [sdk])

  return (
    <div className="Toolbar">
      <button className="undo" onClick={sdk?.dataLayer.undo}>
        <BiUndo />
      </button>
      <button className="redo" onClick={sdk?.dataLayer.redo}>
        <BiRedo />
      </button>
      <button
        className={classNames('gizmo', 'translate', { active: selectedEntityValue?.gizmo === GizmoType.TRANSLATE })}
        disabled={disableGizmos}
        onClick={() => setSelectedEntityValue({ gizmo: 0 })}
      ></button>
      <button
        className={classNames('gizmo', 'rotate', { active: selectedEntityValue?.gizmo === GizmoType.ROTATE })}
        disabled={disableGizmos}
        onClick={() => setSelectedEntityValue({ gizmo: 1 })}
      ></button>
      <button
        className={classNames('gizmo', 'scale', { active: selectedEntityValue?.gizmo === GizmoType.SCALE })}
        disabled={disableGizmos}
        onClick={() => setSelectedEntityValue({ gizmo: 2 })}
      ></button>
    </div>
  )
})

export default Toolbar
