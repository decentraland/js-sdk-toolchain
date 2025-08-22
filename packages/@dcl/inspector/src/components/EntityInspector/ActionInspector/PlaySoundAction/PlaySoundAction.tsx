import React, { useCallback, useMemo, useState } from 'react'
import { ActionPayload, ActionType } from '@dcl/asset-packs'
import { recursiveCheck } from 'jest-matcher-deep-close-to/lib/recursiveCheck'

import { useAppSelector } from '../../../../redux/hooks'
import { selectAssetCatalog } from '../../../../redux/app'

import { isAudio, isValidVolume, volumeToAudioSource, volumeFromAudioSource } from '../../AudioSourceInspector/utils'
import { Dropdown, RangeField, InfoTooltip, FileUploadField, CheckboxField } from '../../../ui'
import { ACCEPTED_FILE_TYPES } from '../../../ui/FileUploadField/types'

import { isValid } from './utils'
import { PLAY_MODE, PLAY_MODE_OPTIONS, type Props } from './types'

import './PlaySoundAction.css'

const PlaySoundAction: React.FC<Props> = ({ value, onUpdate }: Props) => {
  const [payload, setPayload] = useState<Partial<ActionPayload<ActionType.PLAY_SOUND>>>({
    ...value
  })

  const files = useAppSelector(selectAssetCatalog)

  const handleUpdate = useCallback(
    (_payload: Partial<ActionPayload<ActionType.PLAY_SOUND>>) => {
      setPayload(_payload)
      if (!recursiveCheck(_payload, value, 2) || !isValid(_payload)) return
      onUpdate(_payload)
    },
    [setPayload, value, onUpdate]
  )

  const handleDrop = useCallback(
    (src: string) => {
      handleUpdate({ ...payload, src })
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
        handleUpdate({ ...payload, volume: volumeToAudioSource(value) })
      }
    },
    [payload, handleUpdate]
  )

  const handleChangeGlobal = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleUpdate({ ...payload, global: e.target.checked })
    },
    [payload, handleUpdate]
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
            options={PLAY_MODE_OPTIONS}
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
        <div className="row">
          <CheckboxField label="Global" checked={!!payload.global} onChange={handleChangeGlobal} />
        </div>
      </div>
    </div>
  )
}

export default React.memo(PlaySoundAction)
