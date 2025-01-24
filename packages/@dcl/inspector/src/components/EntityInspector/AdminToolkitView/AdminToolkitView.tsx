import React, { useCallback, useState, useMemo } from 'react'
import { AiOutlineInfoCircle as InfoIcon } from 'react-icons/ai'
import { Action } from '@dcl/asset-packs'
import { withSdk } from '../../../hoc/withSdk'
import { getComponentValue, useComponentValue } from '../../../hooks/sdk/useComponentValue'
import { useHasComponent } from '../../../hooks/sdk/useHasComponent'
import { Container } from '../../Container'
import { Block } from '../../Block'
import { CheckboxField, TextField, Vector3Field, Dropdown, EntityField } from '../../ui'
import { CheckboxGroup } from '../../ui/CheckboxGroup'
import { type Props } from './types'

import { Accordion } from '../../ui/Accordion'
import { Button } from '../../Button'
import { Entity } from '@dcl/ecs'
import { useEntitiesWith } from '../../../hooks/sdk/useEntitiesWith'
import { useComponentsWith } from '../../../hooks/sdk/useComponentsWith'
import './AdminToolkitView.css'
import MoreOptionsMenu from '../MoreOptionsMenu'
import { RemoveButton } from '../RemoveButton'
import { AddButton } from '../AddButton'
import { Component } from '../../../lib/sdk/components'

enum DEFAULT_ADMIN_PERMISSIONS {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE'
}

const AdminToolkitView = withSdk<Props>(({ sdk, entity }) => {
  const { AdminTools, Name, Actions } = sdk.components
  const [adminComponent, setAdminComponent] = useComponentValue(entity, AdminTools)
  const [videoPlayerEntities] = useComponentsWith((components) => components.VideoPlayer)
  const entitiesWithAction: Entity[] = useEntitiesWith((components) => components.Actions)
  const hasAdmintoolkit = useHasComponent(entity, AdminTools)

  if (!hasAdmintoolkit) return null

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
        moderation: {
          ...adminComponent.moderation,
          kickCoordinates: value
        }
      })
    },
    [adminComponent, setAdminComponent]
  )

  const handleAddVideoPlayer = useCallback(() => {
    if (!adminComponent) return
    setAdminComponent({
      ...adminComponent,
      videoControl: {
        ...adminComponent.videoControl,
        videoPlayers: [...(adminComponent.videoControl.videoPlayers || []), { entity: 0, name: '' }]
      }
    })
  }, [adminComponent, setAdminComponent])

  const handleRemoveVideoPlayer = useCallback(
    (idx: number) => {
      if (!adminComponent) return

      const updatedVideoPlayers = adminComponent.videoControl.videoPlayers?.filter((_, index) => index !== idx)

      setAdminComponent({
        ...adminComponent,
        videoControl: {
          ...adminComponent.videoControl,
          videoPlayers: updatedVideoPlayers
        }
      })
    },
    [adminComponent, setAdminComponent]
  )

  const handleVideoPlayerChange = useCallback(
    (idx: number, event: React.ChangeEvent<HTMLSelectElement>) => {
      if (!adminComponent) return

      const updatedVideoPlayers =
        adminComponent.videoControl.videoPlayers?.map((videoPlayer, index) =>
          index === idx ? { ...videoPlayer, entity: Number(event.target.value) } : videoPlayer
        ) || []

      setAdminComponent({
        ...adminComponent,
        videoControl: {
          ...adminComponent.videoControl,
          videoPlayers: updatedVideoPlayers
        }
      })
    },
    [adminComponent, setAdminComponent]
  )

  const handleVideoPlayerNameChange = useCallback(
    (idx: number, event: React.ChangeEvent<HTMLInputElement>) => {
      if (!adminComponent) return

      const updatedVideoPlayers =
        adminComponent.videoControl.videoPlayers?.map((videoPlayer, index) =>
          index === idx ? { ...videoPlayer, name: event.target.value } : videoPlayer
        ) || []

      setAdminComponent({
        ...adminComponent,
        videoControl: {
          ...adminComponent.videoControl,
          videoPlayers: updatedVideoPlayers
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

  // Memoize selected video players for option disabling
  const getVideoPlayerOptions = useCallback(() => {
    const selectedEntities = new Set(
      adminComponent?.videoControl.videoPlayers?.map((videoPlayer) => videoPlayer.entity) || []
    )

    return videoPlayerEntities.map((videoPlayer) => ({
      value: videoPlayer.entity,
      label: Name.getOrNull(videoPlayer.entity)?.value || `Screen ${videoPlayer.entity}`,
      disabled: videoPlayer.entity !== 0 && selectedEntities.has(videoPlayer.entity) // Allow 0 as it's the default unselected value
    }))
  }, [videoPlayerEntities, adminComponent?.videoControl.videoPlayers, Name])

  const availableActions: Map<number, { actions: Action[] }> = useMemo(() => {
    return entitiesWithAction?.reduce((actions, entityWithAction) => {
      const actionsComponentValue = getComponentValue(entityWithAction, Actions)
      if (actionsComponentValue.value.length > 0) {
        actions.set(entityWithAction, { actions: actionsComponentValue.value as Action[] })
      }
      return actions
    }, new Map<number, { actions: Action[] }>())
  }, [entitiesWithAction])

  const handleChangeSmartItemActionsEntity = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>, idx: number) => {
      if (!adminComponent) return
      const updatedSmartItems =
        adminComponent.smartItemActions.smartItems?.map((item, index) =>
          index === idx ? { ...item, entity: Number(e.target.value) } : item
        ) || []

      setAdminComponent({
        ...adminComponent,
        smartItemActions: {
          ...adminComponent.smartItemActions,
          smartItems: updatedSmartItems
        }
      })
    },
    [adminComponent, setAdminComponent]
  )

  const handleChangeSmartItemActionsAction = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>, idx: number) => {
      if (!adminComponent) return
      const updatedSmartItems =
        adminComponent.smartItemActions.smartItems?.map((item, index) =>
          index === idx ? { ...item, defaultAction: e.target.value } : item
        ) || []

      console.log({ updatedSmartItems })

      setAdminComponent({
        ...adminComponent,
        smartItemActions: {
          ...adminComponent.smartItemActions,
          smartItems: updatedSmartItems
        }
      })
    },
    [adminComponent, setAdminComponent]
  )

  const handleChangeSmartItemActionsCustomName = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
      if (!adminComponent) return
      const updatedSmartItems =
        adminComponent.smartItemActions.smartItems?.map((item, index) =>
          index === idx ? { ...item, customName: e.target.value } : item
        ) || []
      setAdminComponent({
        ...adminComponent,
        smartItemActions: { ...adminComponent.smartItemActions, smartItems: updatedSmartItems }
      })
    },
    [adminComponent, setAdminComponent]
  )

  const handleRemoveSmartItemAction = useCallback(
    (_: React.MouseEvent, idx: number) => {
      if (!adminComponent) return
      const updatedSmartItems = adminComponent.smartItemActions.smartItems?.filter((_, index) => index !== idx) || []

      setAdminComponent({
        ...adminComponent,
        smartItemActions: {
          ...adminComponent.smartItemActions,
          smartItems: updatedSmartItems
        }
      })
    },
    [adminComponent, setAdminComponent]
  )
  if (!adminComponent) return

  const handleAddSmartItemAction = useCallback(() => {
    if (!adminComponent) return

    setAdminComponent({
      ...adminComponent,
      smartItemActions: {
        ...adminComponent.smartItemActions,
        smartItems: [
          ...(adminComponent.smartItemActions.smartItems || []),
          { entity: 0, defaultAction: '', customName: '' }
        ]
      }
    })
  }, [adminComponent, setAdminComponent])

  if (!adminComponent) return null

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
      <Accordion label="MODERATION" className="PanelSection">
        <Vector3Field
          label="Kick Coordinates"
          useLeftLabels
          value={adminComponent.moderation.kickCoordinates || { x: 0, y: 0, z: 0 }}
          onChange={handleKickCoordinatesChange}
        />
      </Accordion>

      <Accordion label="TEXT ANNOUNCEMENT" className="PanelSection">
        <CheckboxGroup>
          <CheckboxField
            label="Play a sound each time a new announcement is made"
            checked={adminComponent.textAnnouncement.playSoundOnEachAnnouncement || false}
            onChange={handleBooleanChange('playSoundOnEachAnnouncement')}
          />
          <CheckboxField
            label="Show author on each announcements"
            checked={adminComponent.textAnnouncement.showAuthorOnEachAnnouncement || false}
            onChange={handleBooleanChange('showAuthorOnEachAnnouncement')}
          />
        </CheckboxGroup>
      </Accordion>

      <Accordion label="VIDEO CONTROL" className="PanelSection">
        <CheckboxGroup>
          <CheckboxField
            label="Disable video sound"
            checked={adminComponent.videoControl.disableVideoPlayersSound || false}
            onChange={handleBooleanChange('disableVideoPlayersSound')}
          />
          <CheckboxField
            label="Show author on each Stream"
            checked={adminComponent.videoControl.showAuthorOnVideoPlayers || false}
            onChange={handleBooleanChange('showAuthorOnVideoPlayers')}
          />
          <CheckboxField
            label="Link all screens by default"
            checked={adminComponent.videoControl.linkAllVideoPlayers || false}
            onChange={handleBooleanChange('linkAllVideoPlayers')}
          />
        </CheckboxGroup>

        {adminComponent.videoControl.videoPlayers?.map((videoPlayer, idx) => {
          const options = getVideoPlayerOptions().map((option) => ({
            ...option,
            disabled: option.disabled && option.value !== videoPlayer.entity // Keep current selection enabled
          }))

          return (
            <Block key={videoPlayer.entity} className="VideoPlayerRow">
              <span>{idx + 1}</span>
              <Dropdown
                label="Screen"
                value={videoPlayer.entity}
                options={options}
                onChange={(e) => handleVideoPlayerChange(idx, e)}
              />
              <TextField
                label="Custom Name"
                value={videoPlayer.name}
                onChange={(e) => handleVideoPlayerNameChange(idx, e)}
              />
              <Button onClick={() => handleRemoveVideoPlayer(idx)}>Remove</Button>
            </Block>
          )
        })}
        <Button
          onClick={handleAddVideoPlayer}
          disabled={videoPlayerEntities.length === adminComponent.videoControl.videoPlayers?.length}
        >
          Add a new Screen
        </Button>
      </Accordion>

      <Accordion label="AIRDROPS" className="PanelSection">
        <CheckboxField label="Allow Non Owners" checked={false} onChange={handleBooleanChange('allowNonOwners')} />
      </Accordion>

      <Accordion label="SMART ITEM ACTIONS" className="PanelSection">
        <CheckboxGroup>
          <CheckboxField
            label="Link All Smart Items"
            checked={adminComponent.smartItemActions.linkAllSmartItems || false}
            onChange={handleBooleanChange('linkAllSmartItems')}
          />
        </CheckboxGroup>
        <div className="SmartItemActionsContainer">
          {adminComponent.smartItemActions.smartItems?.map((smartItem, idx) => {
            const actions = smartItem.entity
              ? (availableActions.get(smartItem.entity)?.actions ?? []).map(({ name }) => ({
                  value: name,
                  label: name
                }))
              : []

            return (
              <div className="SmartItemAction" key={`smart-item-${idx}`}>
                <div className="Fields">
                  <EntityField
                    components={[sdk.components.Actions] as Component[]}
                    value={smartItem.entity}
                    onChange={(e) => handleChangeSmartItemActionsEntity(e, idx)}
                  />
                  <TextField
                    label="Custom Name"
                    value={smartItem.customName}
                    onChange={(e) => handleChangeSmartItemActionsCustomName(e, idx)}
                  />
                  <Dropdown
                    placeholder="Default Action"
                    disabled={!smartItem.entity}
                    options={actions}
                    value={smartItem.defaultAction}
                    onChange={(e) => handleChangeSmartItemActionsAction(e, idx)}
                  />
                </div>
                <div className="RightMenu">
                  <MoreOptionsMenu>
                    <RemoveButton onClick={(e) => handleRemoveSmartItemAction(e, idx)}>Remove Smart Item</RemoveButton>
                  </MoreOptionsMenu>
                </div>
              </div>
            )
          })}
          <AddButton onClick={handleAddSmartItemAction}>Add Smart Item</AddButton>
        </div>
      </Accordion>
    </Container>
  )
})

export default React.memo(AdminToolkitView)
