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
import { getHiddenPanels } from '../../redux/ui'
import { PanelName } from '../../redux/ui/types'

const App = () => {
  const selectedEntity = useSelectedEntity()
  const { height } = useWindowSize()

  const sdkInitialized = useAppSelector(selectEngines).inspector

  const hiddenPanels = useAppSelector(getHiddenPanels)

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
            {!hiddenPanels[PanelName.ENTITIES] && (
              <>
                <Panel defaultSize={15} minSize={15} order={1}>
                  <Box className="composite-inspector">
                    <Hierarchy />
                  </Box>
                </Panel>
                <PanelResizeHandle className="horizontal-handle" />
              </>
            )}

            <Panel minSize={30} order={2}>
              <Box
                className={cx('composite-renderer', {
                  'no-box':
                    !!hiddenPanels[PanelName.ENTITIES] &&
                    !!hiddenPanels[PanelName.ASSETS] &&
                    !!hiddenPanels[PanelName.COMPONENTS]
                })}
              >
                {!hiddenPanels[PanelName.TOOLBAR] && <Toolbar />}
                <Renderer />
              </Box>
            </Panel>
            {!hiddenPanels[PanelName.COMPONENTS] && selectedEntity !== null && (
              <>
                <PanelResizeHandle className="horizontal-handle" />
                <Panel defaultSize={25.5} minSize={20} order={3}>
                  <Box className="entity-inspector">
                    <EntityInspector />
                  </Box>
                </Panel>
              </>
            )}
          </PanelGroup>
        </Panel>
        {!hiddenPanels[PanelName.ASSETS] && (
          <>
            <PanelResizeHandle className="vertical-handle" />
            <Panel minSize={footerMin} defaultSize={30}>
              <Box className="composite-renderer">
                <Assets />
              </Box>
            </Panel>
          </>
        )}
      </PanelGroup>
    </div>
  )
}

export default React.memo(App)
