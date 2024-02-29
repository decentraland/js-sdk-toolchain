import { useCallback } from 'react'
import { BiUndo, BiRedo, BiSave, BiBadgeCheck } from 'react-icons/bi'
import { RiListSettingsLine } from 'react-icons/ri'
import { FaPencilAlt } from 'react-icons/fa'

import { withSdk } from '../../hoc/withSdk'
import { Gizmos } from './Gizmos'
import { Preferences } from './Preferences'
import { ToolbarButton } from './ToolbarButton'
import { save, undo, redo } from '../../redux/data-layer'
import { selectCanSave } from '../../redux/app'
import { useAppSelector, useAppDispatch } from '../../redux/hooks'
import { REDO, REDO_2, REDO_ALT, REDO_ALT_2, SAVE, SAVE_ALT, UNDO, UNDO_ALT, useHotkey } from '../../hooks/useHotkey'
import './Toolbar.css'

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
  }, [sdk])

  const handleSaveClick = useCallback(() => dispatch(save()), [])
  const handleUndo = useCallback(() => dispatch(undo()), [])
  const handleRedo = useCallback(() => dispatch(redo()), [])

  useHotkey([SAVE, SAVE_ALT], handleSaveClick)
  useHotkey([UNDO, UNDO_ALT], handleUndo)
  useHotkey([REDO, REDO_2, REDO_ALT, REDO_ALT_2], handleRedo)

  const handleEditScene = useCallback(async () => {
    sdk.operations.updateSelectedEntity(sdk.engine.RootEntity, false)
    await sdk.operations.dispatch()
  }, [sdk])

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
      <div className="RightContent">
        <ToolbarButton className="edit-scene" onClick={handleEditScene}>
          <FaPencilAlt />
        </ToolbarButton>
      </div>
    </div>
  )
})

export default Toolbar
