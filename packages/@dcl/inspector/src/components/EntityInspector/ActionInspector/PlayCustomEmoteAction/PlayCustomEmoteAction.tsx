import React, { useCallback, useMemo, useState } from 'react'
import { ActionPayload, ActionType } from '@dcl/asset-packs'
import { recursiveCheck } from 'jest-matcher-deep-close-to/lib/recursiveCheck'
import { CheckboxField, FileUploadField } from '../../../ui'
import { ACCEPTED_FILE_TYPES } from '../../../ui/FileUploadField/types'
import { useAppSelector } from '../../../../redux/hooks'
import { selectAssetCatalog } from '../../../../redux/app'
import type { Props } from './types'
import { isModel } from './utils'

import './PlayCustomEmoteAction.css'

function isValid(
  payload: Partial<ActionPayload<ActionType.PLAY_CUSTOM_EMOTE>>
): payload is ActionPayload<ActionType.PLAY_CUSTOM_EMOTE> {
  return typeof payload.src === 'string' && payload.src.length > 0
}

const PlayCustomEmoteAction: React.FC<Props> = ({ value, onUpdate }: Props) => {
  const [payload, setPayload] = useState<Partial<ActionPayload<ActionType.PLAY_CUSTOM_EMOTE>>>({
    ...value
  })

  const files = useAppSelector(selectAssetCatalog)

  const handleUpdate = useCallback(
    (_payload: Partial<ActionPayload<ActionType.PLAY_CUSTOM_EMOTE>>) => {
      setPayload(_payload)
      if (!recursiveCheck(_payload, value, 2) || !isValid(_payload)) return
      onUpdate(_payload)
    },
    [setPayload, value, onUpdate]
  )

  const handleChangeSrc = useCallback(
    (path: string) => {
      handleUpdate({ ...payload, src: path })
    },
    [payload, handleUpdate]
  )

  const handleChangeLoop = useCallback(
    ({ target: { checked } }: React.ChangeEvent<HTMLInputElement>) => {
      handleUpdate({ ...payload, loop: checked })
    },
    [payload, handleUpdate]
  )

  const error = useMemo(() => {
    if (!files || !payload.src) {
      return false
    }
    return !files.assets.some(($) => $.path === payload.src)
  }, [files, payload])

  return (
    <div className="PlayCustomEmoteActionContainer">
      <div className="row">
        <FileUploadField
          value={payload.src}
          accept={ACCEPTED_FILE_TYPES['model']}
          onDrop={handleChangeSrc}
          error={files && (!isValid || error)}
          isValidFile={isModel}
        />
        <CheckboxField
          label="Loop"
          checked={payload.loop}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChangeLoop(e)}
        />
      </div>
    </div>
  )
}

export default React.memo(PlayCustomEmoteAction)
