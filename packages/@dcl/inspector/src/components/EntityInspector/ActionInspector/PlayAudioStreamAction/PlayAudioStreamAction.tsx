import React, { useCallback, useEffect, useState } from 'react'
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

  useEffect(() => {
    if (!recursiveCheck(payload, value, 2) || !isValid(payload)) return
    onUpdate(payload)
  }, [payload, onUpdate])

  const handleChangeUrl = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
      setPayload({ ...payload, url: value })
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
    <div className="PlayAudioStreamActionContainer">
      <Block>
        <TextField label="URL" value={payload.url} onChange={handleChangeUrl} />
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
