import { useCallback } from 'react'
import { BiUndo, BiRedo } from 'react-icons/bi'
import { RiListSettingsLine } from 'react-icons/ri'
import classnames from 'classnames'
import { withSdk } from '../../hoc/withSdk'
import { useSelectedEntity } from '../../hooks/sdk/useSelectedEntity'
import { useComponentValue } from '../../hooks/sdk/useComponentValue'
import { GizmoType } from '../../lib/utils/gizmo'
import { ROOT } from '../../lib/sdk/tree'
import Button from '../Button'

import './Toolbar.css'

const Toolbar = withSdk(({ sdk }) => {
  const entity = useSelectedEntity()

  const [selection, setSelection] = useComponentValue(entity || ROOT, sdk.components.Selection)

  const handleTranslateGizmo = useCallback(() => setSelection({ gizmo: GizmoType.TRANSLATE }), [setSelection])
  const handleRotateGizmo = useCallback(() => setSelection({ gizmo: GizmoType.ROTATE }), [setSelection])
  const handleScaleGizmo = useCallback(() => setSelection({ gizmo: GizmoType.SCALE }), [setSelection])

  const disableGizmos = !entity

  const handleInspector = useCallback(() => {
    const { debugLayer } = sdk.scene
    if (debugLayer.isVisible()) {
      debugLayer.hide()
    } else {
      void debugLayer.show({ showExplorer: true, embedMode: true })
    }
  }, [])

  return (
    <div className="Toolbar">
      <Button className="undo" onClick={sdk?.dataLayer.undo}>
        <BiUndo />
      </Button>
      <Button className="redo" onClick={sdk?.dataLayer.redo}>
        <BiRedo />
      </Button>
      <Button
        className={classnames('gizmo translate', { active: selection?.gizmo === GizmoType.TRANSLATE })}
        disabled={disableGizmos}
        onClick={handleTranslateGizmo}
      ></Button>
      <Button
        className={classnames('gizmo rotate', { active: selection?.gizmo === GizmoType.ROTATE })}
        disabled={disableGizmos}
        onClick={handleRotateGizmo}
      ></Button>
      <Button
        className={classnames('gizmo scale', { active: selection?.gizmo === GizmoType.SCALE })}
        disabled={disableGizmos}
        onClick={handleScaleGizmo}
      ></Button>
      <Button className="babylonjs-inspector" onClick={handleInspector}>
        <RiListSettingsLine />
      </Button>
    </div>
  )
})

export default Toolbar
