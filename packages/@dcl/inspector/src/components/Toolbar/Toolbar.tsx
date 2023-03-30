import React from 'react'
import { BiUndo, BiRedo } from 'react-icons/bi'

import './Toolbar.css'

function noop() {}

function Toolbar() {
  return (
    <div className="toolbar">
      <button className="undo" onClick={noop}>
        <BiUndo />
      </button>
      <button className="redo" onClick={noop}>
        <BiRedo />
      </button>
    </div>
  )
}

export default Toolbar
