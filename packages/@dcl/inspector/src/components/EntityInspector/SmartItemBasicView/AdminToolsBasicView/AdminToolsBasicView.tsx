import React, { useCallback, useMemo } from 'react'

import { withSdk } from '../../../../hoc/withSdk'
import { useComponentValue } from '../../../../hooks/sdk/useComponentValue'

import { Accordion } from '../../../ui'

import { VideoControl } from '../../AdminToolkitView/VideoControl'
import { SmartItemControl } from '../../AdminToolkitView/SmartItemControl'
import { TextAnnouncementControl } from '../../AdminToolkitView/TextAnnouncementControl'

import { type Props } from '../../AdminToolkitView/types'

import './AdminToolsBasicView.css'

const AdminToolsBasicView = withSdk<Props>(({ sdk, entity }) => {
  const { AdminTools, Config } = sdk.components
  const [adminComponent, setAdminComponent] = useComponentValue(entity, AdminTools)

  const handleToggleEnabled = useCallback(
    (
      control: 'videoControl' | 'textAnnouncementControl' | 'rewardsControl' | 'smartItemsControl',
      enabled: boolean
    ) => {
      if (!adminComponent) return
      setAdminComponent({
        ...adminComponent,
        [control]: { ...adminComponent[control], isEnabled: enabled }
      })
    },
    [adminComponent, setAdminComponent]
  )

  const config = useMemo(() => {
    return Config.getOrNull(entity)
  }, [entity])

  if (!config || !adminComponent) return null

  return (
    <div className="AdminToolsBasicViewInspector">
      <Accordion
        label="TEXT ANNOUNCEMENTS"
        className="PanelSection border"
        enabled={!!adminComponent.textAnnouncementControl?.isEnabled}
        onToggleEnabled={(enabled) => handleToggleEnabled('textAnnouncementControl', enabled)}
      >
        <TextAnnouncementControl entity={entity} />
      </Accordion>
      <Accordion
        label="VIDEO SCREENS"
        className="PanelSection border"
        enabled={!!adminComponent.videoControl?.isEnabled}
        onToggleEnabled={(enabled) => handleToggleEnabled('videoControl', enabled)}
      >
        <VideoControl entity={entity} />
      </Accordion>
      <Accordion
        label="SMART ITEM ACTIONS"
        className="PanelSection border"
        enabled={!!adminComponent.smartItemsControl?.isEnabled}
        onToggleEnabled={(enabled) => handleToggleEnabled('smartItemsControl', enabled)}
      >
        <SmartItemControl entity={entity} />
      </Accordion>
    </div>
  )
})

export default React.memo(AdminToolsBasicView)
