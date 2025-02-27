import React, { useCallback } from 'react'
import { Entity } from '@dcl/ecs'
import { VscTrash as RemoveIcon } from 'react-icons/vsc'
import { withSdk, WithSdkProps } from '../../../../hoc/withSdk'
import { useComponentValue } from '../../../../hooks/sdk/useComponentValue'
import { useComponentsWith } from '../../../../hooks/sdk/useComponentsWith'

import { CheckboxField, CheckboxGroup, TextField, Dropdown } from '../../../ui'
import { Block } from '../../../Block'
import { Button } from '../../../Button'
import { AddButton } from '../../AddButton'
import MoreOptionsMenu from '../../MoreOptionsMenu'

import './VideoControl.css'

type Props = {
  entity: Entity
}

const VideoControl: React.FC<WithSdkProps & Props> = ({ sdk, entity }) => {
  const { AdminTools, Name } = sdk.components
  const [adminComponent, setAdminComponent] = useComponentValue(entity, AdminTools)
  const [videoPlayerEntities] = useComponentsWith((components) => components.VideoPlayer)

  const handleAddVideoPlayer = useCallback(() => {
    if (!adminComponent) return
    setAdminComponent({
      ...adminComponent,
      videoControl: {
        ...adminComponent.videoControl,
        videoPlayers: [...(adminComponent.videoControl.videoPlayers || []), { entity: 0, customName: '' }]
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
          index === idx ? { ...videoPlayer, customName: event.target.value } : videoPlayer
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

  const handleBooleanChange = useCallback(
    (field: keyof typeof adminComponent.videoControl) => (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!adminComponent) return
      setAdminComponent({
        ...adminComponent,
        videoControl: {
          ...adminComponent.videoControl,
          [field]: event.target.checked
        }
      })
    },
    [adminComponent, setAdminComponent]
  )

  const getVideoPlayerOptions = useCallback(() => {
    const selectedEntities = new Set(
      adminComponent?.videoControl.videoPlayers?.map((videoPlayer) => videoPlayer.entity) || []
    )

    return videoPlayerEntities.map((videoPlayer) => ({
      value: videoPlayer.entity,
      label: Name.getOrNull(videoPlayer.entity)?.value || `Screen ${videoPlayer.entity}`,
      disabled: videoPlayer.entity !== 0 && selectedEntities.has(videoPlayer.entity)
    }))
  }, [videoPlayerEntities, adminComponent?.videoControl.videoPlayers, Name])

  if (!adminComponent) return null

  const { videoControl } = adminComponent

  return (
    <div className="VideoControl">
      <CheckboxGroup>
        <CheckboxField
          label="Disable video sound"
          checked={videoControl.disableVideoPlayersSound || false}
          onChange={handleBooleanChange('disableVideoPlayersSound')}
        />
      </CheckboxGroup>

      {videoControl.videoPlayers?.map((videoPlayer, idx) => {
        const options = getVideoPlayerOptions().map((option) => ({
          ...option,
          disabled: option.disabled && option.value !== videoPlayer.entity
        }))

        return (
          <Block key={`video-player-${idx}`} className="VideoPlayerRow">
            <div className="LeftColumn">
              <span>{idx + 1}</span>
            </div>
            <div className="FieldsContainer">
              <Dropdown
                label="Screen"
                value={videoPlayer.entity}
                options={options}
                onChange={(e) => handleVideoPlayerChange(idx, e)}
              />
              <TextField
                label="Custom Name"
                value={videoPlayer.customName}
                onChange={(e) => handleVideoPlayerNameChange(idx, e)}
              />
            </div>
            <div className="RightMenu">
              <MoreOptionsMenu>
                <Button className="RemoveButton" onClick={() => handleRemoveVideoPlayer(idx)}>
                  <RemoveIcon /> Remove
                </Button>
              </MoreOptionsMenu>
            </div>
          </Block>
        )
      })}
      <AddButton
        onClick={handleAddVideoPlayer}
        disabled={videoPlayerEntities.length === videoControl.videoPlayers?.length}
      >
        Add a new Screen
      </AddButton>
    </div>
  )
}

export default React.memo(withSdk(VideoControl))
