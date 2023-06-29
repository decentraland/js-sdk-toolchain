import React from 'react'
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels'
import cx from 'classnames'

import { EntityInspector } from '../EntityInspector'
import { Hierarchy } from '../Hierarchy'
import { Renderer } from '../Renderer'
import { Box } from '../Box'
import { Toolbar } from '../Toolbar'

import './App.css'
import Assets from '../Assets'
import { useSelectedEntity } from '../../hooks/sdk/useSelectedEntity'
import { useWindowSize } from '../../hooks/useWindowSize'
import { useAppSelector } from '../../redux/hooks'
import { selectDataLayerError } from '../../redux/data-layer'
import { selectEngines } from '../../redux/sdk'

const App = () => {
  const selectedEntity = useSelectedEntity()
  const { height } = useWindowSize()

  const sdkInitialized = useAppSelector(selectEngines).inspector

  // Footer's height is 48 pixels, so we need to calculate the percentage of the screen that it takes to pass as the minSize prop for the Panel
  const footerMin = (48 / height!) * 100
  const disconnected = useAppSelector(selectDataLayerError)
  return (
    <div
      className={cx('App', { 'is-ready': !!sdkInitialized })}
      style={{ pointerEvents: disconnected ? 'none' : 'auto' }}
    >
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
