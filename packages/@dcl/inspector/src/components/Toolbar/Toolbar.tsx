import { useCallback } from 'react'
import { BiUndo, BiRedo, BiSave, BiBadgeCheck } from 'react-icons/bi'
import { RiListSettingsLine } from 'react-icons/ri'

import { withSdk } from '../../hoc/withSdk'
import { Gizmos } from './Gizmos'
import { Preferences } from './Preferences'
import { ToolbarButton } from './ToolbarButton'
import './Toolbar.css'
import { save, undo, redo } from '../../redux/data-layer'
import { selectCanSave } from '../../redux/app'
import { useAppSelector, useAppDispatch } from '../../redux/hooks'

const Toolbar = withSdk(({ sdk }) => {
  const canSave = useAppSelector(selectCanSave)
  const dispatch = useAppDispatch()

  // TODO: Remove withSdk
  const handleInspector = useCallback(() => {
    const { debugLayer } = sdk.scene
    if (debugLayer.isVisible()) {
      debugLayer.hide()
    } else {
      void debugLayer.show({ showExplorer: true, embedMode: true })
    }
  }, [])

  const handleSaveClick = useCallback(() => dispatch(save()), [])
  const handleUndo = useCallback(() => dispatch(undo()), [])
  const handleRedo = useCallback(() => dispatch(redo()), [])

  return (
    <div className="Toolbar">
      <ToolbarButton
        className="save"
        onClick={canSave ? handleSaveClick : undefined}
        title={canSave ? 'Save changes' : 'All changes saved'}
      >
        {canSave ? <BiSave /> : <BiBadgeCheck />}
      </ToolbarButton>
      <ToolbarButton className="undo" title="Undo" onClick={handleUndo}>
        <BiUndo />
      </ToolbarButton>
      <ToolbarButton className="redo" title="Redo" onClick={handleRedo}>
        <BiRedo />
      </ToolbarButton>
      <Gizmos />
      <Preferences />
      <ToolbarButton className="babylonjs-inspector" onClick={handleInspector}>
        <RiListSettingsLine />
      </ToolbarButton>
    </div>
  )
})

export default Toolbar
