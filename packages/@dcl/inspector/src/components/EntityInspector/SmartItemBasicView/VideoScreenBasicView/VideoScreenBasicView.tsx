import React, { useCallback, useEffect } from 'react'
import { AiOutlineInfoCircle as InfoIcon } from 'react-icons/ai'
import { MediaSource, LIVEKIT_STREAM_SRC } from '@dcl/asset-packs'

import { withSdk } from '../../../../hoc/withSdk'
import { useComponentValue } from '../../../../hooks/sdk/useComponentValue'
import { Container } from '../../../Container'
import { CheckboxField, CheckboxGroup, Dropdown, Label, RangeField, TextField } from '../../../ui'
import { type Props } from '../../AdminToolkitView/types'
import { isValidVolume } from '../../VideoPlayerInspector/utils'
import { Block } from '../../../Block'
import { isValidHttpsUrl } from '../../../../lib/utils/url'

import './VideoScreenBasicView.css'
const VideoScreenBasicView = withSdk<Props>(({ sdk, entity }) => {
  const { VideoScreen, VideoPlayer } = sdk.components
  const [videoScreenComponent, setVideoScreenComponent] = useComponentValue(entity, VideoScreen)
  const [videoPlayerComponent, setVideoPlayerComponent] = useComponentValue(entity, VideoPlayer)
  const [isValidURL, setIsValidURL] = React.useState(true)

  const handleVideoMediaSourceChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      if (!videoScreenComponent) return
      const value = Number(event.target.value) as any as MediaSource

      setVideoScreenComponent({
        ...videoScreenComponent,
        defaultMediaSource: value
      })
    },
    [videoScreenComponent, setVideoScreenComponent]
  )

  const handleCheckboxChange = useCallback(
    (property: 'loop' | 'playing') => (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!videoPlayerComponent) return
      setVideoPlayerComponent({
        ...videoPlayerComponent,
        [property]: e.target.checked
      })
    },
    [videoPlayerComponent, setVideoPlayerComponent]
  )
  useEffect(() => {
    if (
      videoScreenComponent.defaultMediaSource === MediaSource.LiveStream &&
      videoPlayerComponent.src !== LIVEKIT_STREAM_SRC
    ) {
      setVideoPlayerComponent({
        ...videoPlayerComponent,
        src: LIVEKIT_STREAM_SRC
      })
    }
    if (videoScreenComponent.defaultMediaSource === MediaSource.VideoURL) {
      setVideoPlayerComponent({
        ...videoPlayerComponent,
        src: videoScreenComponent.defaultURL
      })
    }
  }, [videoScreenComponent.defaultMediaSource, videoScreenComponent.defaultURL])

  return (
    <div className="VideoScreenBasicViewInspector">
      <Label className="Title" text="General Player Settings" />
      <Block className="volume" label="Volume">
        <RangeField
          value={Math.round((videoPlayerComponent.volume ?? 0) * 100)}
          onChange={(e: any) => {
            setVideoPlayerComponent({ ...videoPlayerComponent, volume: Number(e.target.value / 100) })
          }}
          isValidValue={isValidVolume}
        />
      </Block>
      <div className="Divider" />
      <Label className="Title" text="Media sources" />
      <Dropdown
        className="DefaultMediaSourcesDropdown"
        label="Default Media Sources"
        value={videoScreenComponent.defaultMediaSource ?? MediaSource.VideoURL}
        onChange={handleVideoMediaSourceChange}
        options={[
          { value: MediaSource.VideoURL, label: 'Video URL' },
          { value: MediaSource.LiveStream, label: 'Live Stream' }
        ]}
      />
      <Container label="VIDEO URL" className="PanelSection">
        <Block label="Default video URL">
          <TextField
            autoSelect
            type="text"
            value={videoScreenComponent.defaultURL}
            onChange={(e) => {
              const value = e.target.value
              if (isValidHttpsUrl(value)) {
                !isValidURL && setIsValidURL(true)
                setVideoScreenComponent({ ...videoScreenComponent, defaultURL: value })
              } else if (isValidURL) {
                setIsValidURL(false)
              }
            }}
            error={!isValidURL}
          />
        </Block>
        <CheckboxGroup className="PlayBack" label="Playback">
          <CheckboxField
            label="Start playing"
            checked={!!videoPlayerComponent?.playing}
            onChange={handleCheckboxChange('playing')}
          />
          <CheckboxField label="Loop" checked={!!videoPlayerComponent?.loop} onChange={handleCheckboxChange('loop')} />
        </CheckboxGroup>
      </Container>
      <Container label="LIVE STREAM" className="PanelSection LiveStreamSection">
        <InfoIcon size={16} />
        <Label text="Stream Keys can be generated and viewed in-world" />
      </Container>
    </div>
  )
})

export default React.memo(VideoScreenBasicView)
