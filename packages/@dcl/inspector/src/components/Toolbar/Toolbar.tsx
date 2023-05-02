import { useCallback } from 'react'
import { BiUndo, BiRedo } from 'react-icons/bi'
import { RiListSettingsLine } from 'react-icons/ri'
import { withSdk } from '../../hoc/withSdk'
import { Gizmos } from './Gizmos'
import { ToolbarButton } from './ToolbarButton'
import './Toolbar.css'
import { fileSystemEvent } from '../../hooks/catalog/useFileSystem'

const Toolbar = withSdk(({ sdk }) => {
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
    },
    []
  )

  return (
    <div className="Toolbar">
      <ToolbarButton className="undo" onClick={handleUndoRedo(sdk?.dataLayer.undo)}>
        <BiUndo />
      </ToolbarButton>
      <ToolbarButton className="redo" onClick={handleUndoRedo(sdk?.dataLayer.redo)}>
        <BiRedo />
      </ToolbarButton>
      <Gizmos />
      <ToolbarButton className="babylonjs-inspector" onClick={handleInspector}>
        <RiListSettingsLine />
      </ToolbarButton>
    </div>
  )
})

export default Toolbar
