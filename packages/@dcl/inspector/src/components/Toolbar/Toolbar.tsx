import { useCallback } from 'react'
import { BiUndo, BiRedo, BiSave, BiBadgeCheck } from 'react-icons/bi'
import { RiListSettingsLine } from 'react-icons/ri'

import { fileSystemEvent } from '../../hooks/catalog/useFileSystem'
import { withSdk } from '../../hoc/withSdk'
import { Gizmos } from './Gizmos'
import { Preferences } from './Preferences'
import { ToolbarButton } from './ToolbarButton'
import './Toolbar.css'
import { getDataLayer, save } from '../../redux/data-layer'
import { getCanSave, updateCanSave } from '../../redux/app'
import { useAppSelector, useAppDispatch } from '../../redux/hooks'
import { DataLayerRpcClient } from '../../lib/data-layer/types'

const Toolbar = withSdk(({ sdk }) => {
  const dataLayer = useAppSelector(getDataLayer)
  const canSave = useAppSelector(getCanSave)
  const dispatch = useAppDispatch()
  const handleInspector = useCallback(() => {
    const { debugLayer } = sdk.scene
    if (debugLayer.isVisible()) {
      debugLayer.hide()
    } else {
      void debugLayer.show({ showExplorer: true, embedMode: true })
    }
  }, [])

  const handleUndoRedo = useCallback(
    (fn?: DataLayerRpcClient['undo']) => async () => {
      if (!fn) return
      const { type } = await fn({})
      if (type === 'file') {
        fileSystemEvent.emit('change')
      }
      dispatch(updateCanSave({ dirty: true }))
    },
    [dataLayer]
  )

  const handleSaveClick = useCallback(() => dispatch(save()), [])

  return (
    <div className="Toolbar">
      <ToolbarButton
        className="save"
        onClick={canSave ? handleSaveClick : undefined}
        title={canSave ? 'Save changes' : 'All changes saved'}
      >
        {canSave ? <BiSave /> : <BiBadgeCheck />}
      </ToolbarButton>
      <ToolbarButton className="undo" title="Undo" onClick={handleUndoRedo(dataLayer?.undo)}>
        <BiUndo />
      </ToolbarButton>
      <ToolbarButton className="redo" title="Redo" onClick={handleUndoRedo(dataLayer?.redo)}>
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
