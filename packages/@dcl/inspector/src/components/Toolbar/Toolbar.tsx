import React from 'react'
import { BiUndo, BiRedo } from 'react-icons/bi'
import { useSdk } from '../../hooks/sdk/useSdk'
import './Toolbar.css'

function Toolbar() {
  const sdk = useSdk()

  return (
    <div className="toolbar">
      <button className="undo" onClick={sdk?.dataLayer.undo}>
        <BiUndo />
      </button>
      <button className="redo" onClick={sdk?.dataLayer.redo}>
        <BiRedo />
      </button>
    </div>
  )
}

export default Toolbar
