import React, { useRef } from 'react'

import { EntityInspector } from '../EntityInspector'
import { Hierarchy } from '../Hierarchy'
import { Renderer } from '../Renderer'
import { Box } from '../Box'
import { Toolbar } from '../Toolbar'
import { PanelGroup, Panel, PanelResizeHandle, ImperativePanelHandle } from 'react-resizable-panels'

import './App.css'
import Assets from '../Assets'
import { useSelectedEntity } from '../../hooks/sdk/useSelectedEntity'
import { useWindowSize } from '../../hooks/useWindowSize'

const App = () => {
  const selectedEntity = useSelectedEntity()

  const { height } = useWindowSize()

  // Footer's height is 36 pixels, so we need to calculate the percentage of the screen that it takes to pass as the minSize prop for the Panel
  const footerMin = (48 / height!) * 100

  return (
    <div className="App">
      <PanelGroup direction="vertical" autoSaveId="vertical">
        <Panel>
          <PanelGroup direction="horizontal" autoSaveId="horizontal">
            <Panel defaultSize={20} minSize={12} order={1}>
              <Box className="composite-inspector">
                <Hierarchy />
              </Box>
            </Panel>
            <PanelResizeHandle className="horizontal-handle" />
            <Panel minSize={30} order={2}>
              <Box className="composite-renderer">
                <Toolbar />
                <Renderer />
              </Box>
            </Panel>
            <PanelResizeHandle className="horizontal-handle" />
            {selectedEntity !== null && (
              <Panel defaultSize={20} minSize={15} order={3}>
                <Box className="entity-inspector">
                  <EntityInspector />
                </Box>
              </Panel>
            )}
          </PanelGroup>
        </Panel>
        <PanelResizeHandle className="vertical-handle" />
        <Panel minSize={footerMin} defaultSize={30}>
          <Box className="composite-renderer">
            <Assets />
          </Box>
        </Panel>
      </PanelGroup>
    </div>
  )
}

export default React.memo(App)
