import React, { useCallback } from 'react'
import { withSdk } from '../../../hoc/withSdk'
import { useComponentValue } from '../../../hooks/sdk/useComponentValue'
import { useHasComponent } from '../../../hooks/sdk/useHasComponent'

import { Accordion, InfoTooltip } from '../../ui'
import { Container } from '../../Container'
import { Block } from '../../Block'

import { RewardsControl } from './RewardsControl'
import { VideoControl } from './VideoControl'
import { SmartItemControl } from './SmartItemControl'
import { AdminAllowListControl } from './AdminAllowListControl'
import { TextAnnouncementControl } from './TextAnnouncementControl'
import { type Props } from './types'
import './AdminToolkitView.css'

const AdminToolkitView = withSdk<Props>(({ sdk, entity }) => {
  const { AdminTools } = sdk.components
  const [adminComponent, setAdminComponent] = useComponentValue(entity, AdminTools)
  const hasAdmintoolkit = useHasComponent(entity, AdminTools)

  const handleToggleEnabled = useCallback(
    (
      control:
        | 'videoControl'
        | 'moderationControl'
        | 'textAnnouncementControl'
        | 'rewardsControl'
        | 'smartItemsControl',
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

  if (!hasAdmintoolkit) return null

  return (
    <Container
      label="Admin Tools"
      className="AdminToolkitViewInspector"
      rightContent={
        <InfoTooltip
          text="Admin Tools enables a whole set of in-world actions for special admin users."
          link="https://docs.decentraland.org/creator/smart-items/#admin-tools"
          type="help"
        />
      }
    >
      <Block>
        <AdminAllowListControl entity={entity} />
      </Block>
      {/* <Accordion
        label="MODERATION"
        className="PanelSection"
        enabled={!!adminComponent.moderationControl.isEnabled}
        onToggleEnabled={(enabled) => handleToggleEnabled('moderationControl', enabled)}
      >
        <Vector3Field
          label="Kick Coordinates"
          useLeftLabels
          value={adminComponent.moderationControl.kickCoordinates || { x: 0, y: 0, z: 0 }}
          onChange={handleKickCoordinatesChange}
        />
      </Accordion> */}

      <Accordion
        label="TEXT ANNOUNCEMENT"
        className="PanelSection"
        enabled={!!adminComponent.textAnnouncementControl.isEnabled}
        onToggleEnabled={(enabled) => handleToggleEnabled('textAnnouncementControl', enabled)}
      >
        <TextAnnouncementControl entity={entity} />
      </Accordion>

      <Accordion
        label="VIDEO CONTROL"
        className="PanelSection"
        enabled={!!adminComponent.videoControl.isEnabled}
        onToggleEnabled={(enabled) => handleToggleEnabled('videoControl', enabled)}
      >
        <VideoControl entity={entity} />
      </Accordion>

      <Accordion
        label="AIRDROPS"
        className="PanelSection"
        enabled={!!adminComponent.rewardsControl.isEnabled}
        onToggleEnabled={(enabled) => handleToggleEnabled('rewardsControl', enabled)}
      >
        <RewardsControl entity={entity} />
      </Accordion>

      <Accordion
        label="SMART ITEM ACTIONS"
        className="PanelSection"
        enabled={!!adminComponent.smartItemsControl.isEnabled}
        onToggleEnabled={(enabled) => handleToggleEnabled('smartItemsControl', enabled)}
      >
        <SmartItemControl entity={entity} />
      </Accordion>
    </Container>
  )
})

export default React.memo(AdminToolkitView)
