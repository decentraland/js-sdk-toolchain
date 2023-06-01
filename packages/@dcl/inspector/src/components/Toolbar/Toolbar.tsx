import { useCallback } from 'react'
import { BiUndo, BiRedo, BiSave, BiBadgeCheck, BiCameraMovie } from 'react-icons/bi'
import { RiListSettingsLine } from 'react-icons/ri'

import { fileSystemEvent } from '../../hooks/catalog/useFileSystem'
import { saveEvent, useSave } from '../../hooks/editor/useSave'
import { withSdk } from '../../hoc/withSdk'
import { Gizmos } from './Gizmos'
import { Camera } from './Camera'
import { ToolbarButton } from './ToolbarButton'

import './Toolbar.css'

const Toolbar = withSdk(({ sdk }) => {
  const [save, isDirty] = useSave()
  const handleInspector = useCallback(() => {
    const { debugLayer } = sdk.scene
    if (debugLayer.isVisible()) {
      debugLayer.hide()
    } else {
      void debugLayer.show({ showExplorer: true, embedMode: true })
    }
  }, [])

  const handleUndoRedo = useCallback(
    (fn: typeof sdk.dataLayer.undo) => async () => {
      const { type } = await fn({})
      if (type === 'file') {
        fileSystemEvent.emit('change')
      }
      saveEvent.emit('change', true)
    },
    []
  )

  return (
    <div className="Toolbar">
      <ToolbarButton className="save" onClick={save}>
        {isDirty ? <BiSave /> : <BiBadgeCheck />}
      </ToolbarButton>
      <ToolbarButton className="undo" onClick={handleUndoRedo(sdk?.dataLayer.undo)}>
        <BiUndo />
      </ToolbarButton>
      <ToolbarButton className="redo" onClick={handleUndoRedo(sdk?.dataLayer.redo)}>
        <BiRedo />
      </ToolbarButton>
      <Gizmos />
      <Camera />
      <ToolbarButton className="babylonjs-inspector" onClick={handleInspector}>
        <RiListSettingsLine />
      </ToolbarButton>
    </div>
  )
})

export default Toolbar
