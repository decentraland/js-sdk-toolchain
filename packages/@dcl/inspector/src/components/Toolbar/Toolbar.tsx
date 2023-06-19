import { useCallback } from 'react'
import { BiUndo, BiRedo, BiSave, BiBadgeCheck } from 'react-icons/bi'
import { RiListSettingsLine } from 'react-icons/ri'

import { fileSystemEvent } from '../../hooks/catalog/useFileSystem'
import { saveEvent, useSave } from '../../hooks/editor/useSave'
import { withSdk } from '../../hoc/withSdk'
import { Gizmos } from './Gizmos'
import { Preferences } from './Preferences'
import { ToolbarButton } from './ToolbarButton'
import './Toolbar.css'
import { getDataLayer } from '../../redux/data-layer'
import { useAppSelector } from '../../redux/hooks'
import { DataLayerRpcClient } from '../../lib/data-layer/types'

const Toolbar = withSdk(({ sdk }) => {
  const dataLayer = useAppSelector(getDataLayer)
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
    (fn?: DataLayerRpcClient['undo']) => async () => {
      if (!fn) return
      const { type } = await fn({})
      if (type === 'file') {
        fileSystemEvent.emit('change')
      }
      saveEvent.emit('change', true)
    },
    [dataLayer]
  )

  return (
    <div className="Toolbar">
      <ToolbarButton className="save" onClick={save} title={isDirty ? 'Save changes' : 'All changes saved'}>
        {isDirty ? <BiSave /> : <BiBadgeCheck />}
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
