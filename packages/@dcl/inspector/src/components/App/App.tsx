import React from 'react'

import { EntityInspector } from '../EntityInspector'
import { Hierarchy } from '../Hierarchy'
import { Renderer } from '../Renderer'
import { Box } from '../Box'
import { Toolbar } from '../Toolbar'

import './App.css'
import { Resizable } from '../Resizable'
import Footer from '../Footer'

const App = () => {
  return (
    <Resizable type="horizontal" min={300} initial={300}>
      <Box>
        <div
          className="sidebar"
          data-vscode-context='{"webviewSection": "sidebar", "preventDefaultContextMenuItems": true}'
        >
          <Resizable type="vertical" min={130} initial={130} max={730}>
            <Hierarchy />
            <EntityInspector />
          </Resizable>
        </div>
      </Box>
      <div className="editor">
        <Box className="composite-renderer">
          <Toolbar />
          <Renderer />
        </Box>
        <Footer />
      </div>
    </Resizable>
  )
}

export default React.memo(App)
