import React, { useCallback } from 'react'
import { AiOutlineInfoCircle as InfoIcon } from 'react-icons/ai'

import { withSdk } from '../../../hoc/withSdk'
import { useComponentValue } from '../../../hooks/sdk/useComponentValue'
import { useHasComponent } from '../../../hooks/sdk/useHasComponent'

import { Accordion, CheckboxField, CheckboxGroup, TextField, Vector3Field, Dropdown } from '../../ui'
import { Container } from '../../Container'
import { Block } from '../../Block'
import { Button } from '../../Button'

import { RewardsControl } from './RewardsControl'
import { VideoControl } from './VideoControl'
import { SmartItemControl } from './SmartItemControl'
import { type Props } from './types'
import './AdminToolkitView.css'

enum DEFAULT_ADMIN_PERMISSIONS {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE'
}

const AdminToolkitView = withSdk<Props>(({ sdk, entity }) => {
  const { AdminTools } = sdk.components
  const [adminComponent, setAdminComponent] = useComponentValue(entity, AdminTools)
  const hasAdmintoolkit = useHasComponent(entity, AdminTools)

  const handleDefaultAdminPermissionChange = useCallback(
    (field: string) => (event: React.ChangeEvent<HTMLSelectElement>) => {
      if (!adminComponent) return
      setAdminComponent({
        ...adminComponent,
        [field]: event.target.value
      })
    },
    [adminComponent, setAdminComponent]
  )

  const handleTextChange = useCallback(
    (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!adminComponent) return
      setAdminComponent({
        ...adminComponent,
        [field]: event.target.value
      })
    },
    [adminComponent, setAdminComponent]
  )

  const handleBooleanChange = useCallback(
    (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!adminComponent) return
      setAdminComponent({
        ...adminComponent,
        [field]: event.target.checked
      })
    },
    [adminComponent, setAdminComponent]
  )

  const handleKickCoordinatesChange = useCallback(
    (value: { x: number; y: number; z: number }) => {
      if (!adminComponent) return
      setAdminComponent({
        ...adminComponent,
        moderationControl: {
          ...adminComponent.moderationControl,
          kickCoordinates: value
        }
      })
    },
    [adminComponent, setAdminComponent]
  )

  const renderDefaultAdminPermissionsInfoMessage = useCallback(
    () => (
      <>
        <InfoIcon size="10" />
        {adminComponent.adminPermissions === DEFAULT_ADMIN_PERMISSIONS.PUBLIC
          ? 'All scene visitors will have access to the Scene Tools panel.'
          : 'Admin permissions are restricted to authorized users only.'}
      </>
    ),
    [adminComponent.adminPermissions]
  )

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
    <Container label="Admin Tools" className="AdminToolkitViewInspector">
      <Block className="DefaultAdminPermissions">
        <Dropdown
          className="DefaultAdminPermissionsDropdown"
          label="Default Admin Permissions"
          value={adminComponent.adminPermissions || DEFAULT_ADMIN_PERMISSIONS.PUBLIC}
          onChange={handleDefaultAdminPermissionChange('adminPermissions')}
          options={[
            { value: DEFAULT_ADMIN_PERMISSIONS.PUBLIC, label: 'Public' },
            { value: DEFAULT_ADMIN_PERMISSIONS.PRIVATE, label: 'Private' }
          ]}
          info={renderDefaultAdminPermissionsInfoMessage()}
        />
        {adminComponent.adminPermissions === DEFAULT_ADMIN_PERMISSIONS.PRIVATE ? (
          <>
            <CheckboxGroup label="Authorized users" className="AuthorizedUsersCheckboxGroup">
              <CheckboxField label="Me" checked={adminComponent.authorizedAdminUsers.me} disabled />
              <CheckboxField
                label="Scene Owners"
                checked={adminComponent.authorizedAdminUsers.sceneOwners}
                onChange={handleBooleanChange('showAuthorText')}
              />
              <CheckboxField
                label="Allow List"
                checked={adminComponent.authorizedAdminUsers.allowList}
                onChange={handleBooleanChange('showAuthorText')}
              />
            </CheckboxGroup>
            <TextField label="Admin Allow List" value={''} onChange={handleTextChange('adminAllowList')} />
            <Button>Add</Button>
            {adminComponent.authorizedAdminUsers.adminAllowList.map((user) => (
              <span>{user}</span>
            ))}
          </>
        ) : null}
      </Block>
      <Accordion
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
      </Accordion>

      <Accordion
        label="TEXT ANNOUNCEMENT"
        className="PanelSection"
        enabled={!!adminComponent.textAnnouncementControl.isEnabled}
        onToggleEnabled={(enabled) => handleToggleEnabled('textAnnouncementControl', enabled)}
      >
        <CheckboxGroup>
          <CheckboxField
            label="Play a sound each time a new announcement is made"
            checked={adminComponent.textAnnouncementControl.playSoundOnEachAnnouncement || false}
            onChange={handleBooleanChange('playSoundOnEachAnnouncement')}
          />
          <CheckboxField
            label="Show author on each announcements"
            checked={adminComponent.textAnnouncementControl.showAuthorOnEachAnnouncement || false}
            onChange={handleBooleanChange('showAuthorOnEachAnnouncement')}
          />
        </CheckboxGroup>
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
