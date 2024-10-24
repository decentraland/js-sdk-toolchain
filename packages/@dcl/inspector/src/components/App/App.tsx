import React, { useCallback, useState } from 'react'
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels'
import cx from 'classnames'

import { useSelectedEntity } from '../../hooks/sdk/useSelectedEntity'
import { useWindowSize } from '../../hooks/useWindowSize'
import { useAppSelector } from '../../redux/hooks'
import { selectDataLayerError } from '../../redux/data-layer'
import { selectEngines } from '../../redux/sdk'
import { getHiddenPanels } from '../../redux/ui'
import { PanelName } from '../../redux/ui/types'

import { EntityInspector } from '../EntityInspector'
import { Hierarchy } from '../Hierarchy'
import { Renderer } from '../Renderer'
import { Box } from '../Box'
import { Toolbar } from '../Toolbar'
import Assets from '../Assets'

import './App.css'

const App = () => {
  const selectedEntity = useSelectedEntity()
  const { height } = useWindowSize()

  const sdkInitialized = useAppSelector(selectEngines).inspector

  const hiddenPanels = useAppSelector(getHiddenPanels)

  const [isAssetsPanelCollapsed, setIsAssetsPanelCollapsed] = useState(false)

  const handleToggleAssetsPanel = useCallback((collapse: boolean) => {
    setIsAssetsPanelCollapsed(collapse)
  }, [])

  // Collapse the panel at 75 pixels
  const collapseAt = (75 / Math.max(1, height ?? 1)) * 100
  // Footer's height is 48 pixels, so we need to calculate the percentage of the screen that it takes to pass as the minSize prop for the Panel
  const footerMin = (48 / Math.max(1, height ?? 1)) * 100

  const disconnected = useAppSelector(selectDataLayerError)
  return (
    <div
      className={cx('App', { 'is-ready': !!sdkInitialized })}
      style={{ pointerEvents: disconnected ? 'none' : 'auto' }}
    >
      <PanelGroup direction="vertical" autoSaveId="vertical">
        <Panel defaultSize={70}>
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
            <Panel
              id="assets"
              defaultSize={30}
              {...(height ? { collapsible: true, collapsedSize: footerMin, minSize: collapseAt } : {})}
              onCollapse={() => handleToggleAssetsPanel(true)}
              onExpand={() => handleToggleAssetsPanel(false)}
            >
              <Box className="composite-renderer">
                <Assets isAssetsPanelCollapsed={isAssetsPanelCollapsed} />
              </Box>
            </Panel>
          </>
        )}
      </PanelGroup>
    </div>
  )
}

export default React.memo(App)
