import React, { useCallback, useState } from 'react'
import { ActionPayload, ActionType } from '@dcl/asset-packs'
import { recursiveCheck } from 'jest-matcher-deep-close-to/lib/recursiveCheck'

import { isValidVolume, volumeFromMediaSource, volumeToMediaSource } from '../../../../lib/utils/media'
import { Block } from '../../../Block'
import { RangeField, TextField } from '../../../ui'
import { isValid } from './utils'
import type { Props } from './types'

import './PlayAudioStreamAction.css'

const PlayAudioStreamAction: React.FC<Props> = ({ value, onUpdate }: Props) => {
  const [payload, setPayload] = useState<Partial<ActionPayload<ActionType.PLAY_AUDIO_STREAM>>>({
    ...value
  })

  const handleUpdate = useCallback(
    (_payload: Partial<ActionPayload<ActionType.PLAY_AUDIO_STREAM>>) => {
      setPayload(_payload)
      if (!recursiveCheck(_payload, value, 2) || !isValid(_payload)) return
      onUpdate(_payload)
    },
    [setPayload, value, onUpdate]
  )

  const handleChangeUrl = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
      handleUpdate({ ...payload, url: value })
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

  return (
    <div className="PlayAudioStreamActionContainer">
      <Block>
        <TextField label="URL" value={payload.url} onChange={handleChangeUrl} autoSelect />
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

export default React.memo(PlayAudioStreamAction)
