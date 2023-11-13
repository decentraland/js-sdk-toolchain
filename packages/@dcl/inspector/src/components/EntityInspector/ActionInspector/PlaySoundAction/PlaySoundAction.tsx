import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ActionPayload, ActionType } from '@dcl/asset-packs'
import { recursiveCheck } from 'jest-matcher-deep-close-to/lib/recursiveCheck'

import { useAppSelector } from '../../../../redux/hooks'
import { selectAssetCatalog } from '../../../../redux/app'

import { isAudio, isValidVolume, volumeToAudioSource, volumeFromAudioSource } from '../../AudioSourceInspector/utils'
import { Dropdown, RangeField, InfoTooltip, FileUploadField } from '../../../ui'
import { ACCEPTED_FILE_TYPES } from '../../../ui/FileUploadField/types'

import { isValid } from './utils'
import type { Props } from './types'

import './PlaySoundAction.css'

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

const PlaySoundAction: React.FC<Props> = ({ value, onUpdate }: Props) => {
  const [payload, setPayload] = useState<Partial<ActionPayload<ActionType.PLAY_SOUND>>>({
    ...value
  })

  const files = useAppSelector(selectAssetCatalog)

  useEffect(() => {
    if (!recursiveCheck(payload, value, 2) || !isValid(payload)) return
    onUpdate(payload)
  }, [payload, onUpdate])

  const handleDrop = useCallback(
    (src: string) => {
      setPayload({ ...payload, src })
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
        setPayload({ ...payload, volume: volumeToAudioSource(value) })
      }
    },
    [payload, setPayload]
  )

  const error = useMemo(() => {
    if (!files || !payload.src) {
      return false
    }
    return !files.assets.some(($) => $.path === payload.src)
  }, [files, payload])

  const renderPathInfo = () => {
    return <InfoTooltip text="You can drag and drop an audio file from the Local Assets" position="right center" />
  }

  return (
    <div className="PlaySoundActionContainer">
      <div className="row">
        <div className="field">
          <FileUploadField
            label={<>Path {renderPathInfo()}</>}
            value={payload.src}
            accept={ACCEPTED_FILE_TYPES['audio']}
            onDrop={handleDrop}
            error={files && (!isValid || error)}
            isValidFile={isAudio}
          />
        </div>
        <div className="field">
          <Dropdown
            label="Play Mode"
            value={payload.loop ? PLAY_MODE.LOOP : PLAY_MODE.PLAY_ONCE}
            options={playModeOptions}
            onChange={handleChangePlayMode}
          />
        </div>
      </div>
      <div className="row">
        <div className="field volume">
          <RangeField
            label="Volume"
            value={volumeFromAudioSource(value.volume)}
            onChange={handleChangeVolume}
            isValidValue={isValidVolume}
          />
        </div>
      </div>
    </div>
  )
}

export default React.memo(PlaySoundAction)
