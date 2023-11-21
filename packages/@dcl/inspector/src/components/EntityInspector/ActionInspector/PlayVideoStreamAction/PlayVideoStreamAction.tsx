import React, { useCallback, useEffect, useState } from 'react'
import { ActionPayload, ActionType } from '@dcl/asset-packs'
import { recursiveCheck } from 'jest-matcher-deep-close-to/lib/recursiveCheck'

import { isValidVolume, volumeFromMediaSource, volumeToMediaSource } from '../../../../lib/utils/media'
import { Block } from '../../../Block'
import { Dropdown, RangeField, TextField } from '../../../ui'
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

enum VIDEO_SOURCE {
  DCL_CAST = 'dcl-cast',
  URL = 'url'
}

const videoSourceOptions = [
  {
    label: 'DCL Cast',
    value: VIDEO_SOURCE.DCL_CAST
  },
  {
    label: 'URL',
    value: VIDEO_SOURCE.URL
  }
]

const PlayVideoStreamAction: React.FC<Props> = ({ value, onUpdate }: Props) => {
  const [payload, setPayload] = useState<Partial<ActionPayload<ActionType.PLAY_VIDEO_STREAM>>>({
    ...value
  })

  useEffect(() => {
    if (!recursiveCheck(payload, value, 2) || !isValid(payload)) return
    onUpdate(payload)
  }, [payload, onUpdate])

  const handleChangeVideoSource = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>) => {
      setPayload({ ...payload, dclCast: value === VIDEO_SOURCE.DCL_CAST })
    },
    [payload, setPayload]
  )

  const handleChangeSrc = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
      setPayload({ ...payload, src: value })
    },
    [payload, setPayload]
  )

  const handleChangePlayMode = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>) => {
      setPayload({ ...payload, loop: value === PLAY_MODE.LOOP })
    },
    [payload, setPayload]
  )

  const handleChangeVolume = useCallback(
    (e: React.ChangeEvent<HTMLElement>) => {
      const { value } = e.target as HTMLInputElement

      if (isValidVolume(value)) {
        setPayload({ ...payload, volume: volumeToMediaSource(value) })
      }
    },
    [payload, setPayload]
  )

  return (
    <div className="PlayVideoStreamActionContainer">
      <Block>
        <Dropdown
          label="Video Source"
          value={payload.dclCast ? VIDEO_SOURCE.DCL_CAST : VIDEO_SOURCE.URL}
          options={videoSourceOptions}
          onChange={handleChangeVideoSource}
          info={
            payload.dclCast && (
              <>
                DCL Cast only works when your scene is deployed to a World.{' '}
                <a
                  href="https://docs.decentraland.org/creator/development-guide/sdk7/video-playing/#streaming-using-decentraland-cast"
                  target="_blank"
                >
                  Learn More
                </a>
              </>
            )
          }
        />
      </Block>
      {!payload.dclCast ? (
        <>
          <Block>
            <TextField label="URL" value={payload.src} onChange={handleChangeSrc} />
          </Block>
          <Block>
            <Dropdown
              label="Play Mode"
              value={payload.loop ? PLAY_MODE.LOOP : PLAY_MODE.PLAY_ONCE}
              options={playModeOptions}
              onChange={handleChangePlayMode}
            />
          </Block>
        </>
      ) : null}
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
