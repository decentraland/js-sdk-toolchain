import React, { useCallback } from 'react'
import { BiUndo, BiRedo } from 'react-icons/bi'
import { RiListSettingsLine } from 'react-icons/ri'
import { useSdk } from '../../hooks/sdk/useSdk'
import './Toolbar.css'

function Toolbar() {
  const sdk = useSdk()

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
    <div className="toolbar">
      <button className="undo" onClick={sdk?.dataLayer.undo}>
        <BiUndo />
      </button>
      <button className="redo" onClick={sdk?.dataLayer.redo}>
        <BiRedo />
      </button>
      <button className="inspector" onClick={handleInspector}>
        <RiListSettingsLine />
      </button>
    </div>
  )
}

export default Toolbar
