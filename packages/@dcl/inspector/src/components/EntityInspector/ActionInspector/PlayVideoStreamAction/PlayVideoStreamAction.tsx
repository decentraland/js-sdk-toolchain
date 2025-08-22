import React, { useCallback, useState } from 'react'
import { ActionPayload, ActionType } from '@dcl/asset-packs'
import { recursiveCheck } from 'jest-matcher-deep-close-to/lib/recursiveCheck'

import { isValidVolume, volumeFromMediaSource, volumeToMediaSource } from '../../../../lib/utils/media'
import { Block } from '../../../Block'
import { Dropdown, InfoTooltip, RangeField, TextField } from '../../../ui'
import { isValid } from './utils'
import type { Props } from './types'

import './PlayVideoStreamAction.css'

enum PLAY_MODE {
  PLAY_ONCE = 'play-once',
  LOOP = 'loop'
}

const playModeOptions = [
  {
    label: 'Play Once',
    value: PLAY_MODE.PLAY_ONCE
  },
  {
    label: 'Loop',
    value: PLAY_MODE.LOOP
  }
]

const PlayVideoStreamAction: React.FC<Props> = ({ value, onUpdate }: Props) => {
  const [payload, setPayload] = useState<Partial<ActionPayload<ActionType.PLAY_VIDEO_STREAM>>>({
    ...value
  })

  const handleUpdate = useCallback(
    (_payload: Partial<ActionPayload<ActionType.PLAY_VIDEO_STREAM>>) => {
      setPayload(_payload)
      if (!recursiveCheck(_payload, value, 2) || !isValid(_payload)) return
      onUpdate(_payload)
    },
    [setPayload, value, onUpdate]
  )

  const handleChangeSrc = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
      handleUpdate({ ...payload, src: value })
    },
    [payload, handleUpdate]
  )

  const handleChangePlayMode = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>) => {
      handleUpdate({ ...payload, loop: value === PLAY_MODE.LOOP })
    },
    [payload, handleUpdate]
  )

  const handleChangeVolume = useCallback(
    (e: React.ChangeEvent<HTMLElement>) => {
      const { value } = e.target as HTMLInputElement

      if (isValidVolume(value)) {
        handleUpdate({ ...payload, volume: volumeToMediaSource(value) })
      }
    },
    [payload, handleUpdate]
  )

  const renderUrlInfo = useCallback(() => {
    return (
      <InfoTooltip
        text="Video URL to display in the Player."
        position="right center"
        link="https://docs.decentraland.org/creator/development-guide/sdk7/video-playing/#about-external-streaming"
      />
    )
  }, [])

  return (
    <div className="PlayVideoStreamActionContainer">
      <Block>
        <TextField label={<>URL {renderUrlInfo()}</>} value={payload.src} onChange={handleChangeSrc} autoSelect />
      </Block>
      <Block>
        <Dropdown
          label="Play Mode"
          value={payload.loop ? PLAY_MODE.LOOP : PLAY_MODE.PLAY_ONCE}
          options={playModeOptions}
          onChange={handleChangePlayMode}
        />
      </Block>
      <Block>
        <RangeField
          label="Volume"
          value={volumeFromMediaSource(value.volume)}
          onChange={handleChangeVolume}
          isValidValue={isValidVolume}
        />
      </Block>
    </div>
  )
}

export default React.memo(PlayVideoStreamAction)
