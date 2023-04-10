import { BiUndo, BiRedo } from 'react-icons/bi'
import { withSdk } from '../../hoc/withSdk'
import { useSelectedEntity } from '../../hooks/sdk/useSelectedEntity'
import { useComponentValue } from '../../hooks/sdk/useComponentValue'
import { ROOT } from '../../lib/sdk/tree'
import './Toolbar.css'
import classNames from 'classnames'
import { useCallback } from 'react'

const Toolbar = withSdk(({ sdk }) => {
  const entity = useSelectedEntity()

  const [selectedEntityValue, setSelectedEntityValue] = useComponentValue(entity || ROOT, sdk.components.EntitySelected)

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
    <div className="Toolbar bordered">
      <button className="undo" onClick={sdk?.dataLayer.undo}>
        <BiUndo />
      </button>
      <button className="redo" onClick={sdk?.dataLayer.redo}>
        <BiRedo />
      </button>
      <button
        className={classNames('gizmo', 'translate', { active: selectedEntityValue?.gizmo === 0 })}
        disabled={disableGizmos}
        onClick={() => setSelectedEntityValue({ gizmo: 0 })}
      ></button>
      <button
        className={classNames('gizmo', 'rotate', { active: selectedEntityValue?.gizmo === 1 })}
        disabled={disableGizmos}
        onClick={() => setSelectedEntityValue({ gizmo: 1 })}
      ></button>
      <button
        className={classNames('gizmo', 'scale', { active: selectedEntityValue?.gizmo === 2 })}
        disabled={disableGizmos}
        onClick={() => setSelectedEntityValue({ gizmo: 2 })}
      ></button>
    </div>
  )
})

export default Toolbar
