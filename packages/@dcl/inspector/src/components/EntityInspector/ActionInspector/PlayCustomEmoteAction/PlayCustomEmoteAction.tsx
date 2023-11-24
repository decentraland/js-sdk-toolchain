import React, { useCallback, useEffect, useMemo, useState } from 'react'
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

  useEffect(() => {
    if (!recursiveCheck(payload, value, 2) || !isValid(payload)) return
    onUpdate(payload)
  }, [payload, onUpdate])

  const handleChangeSrc = useCallback(
    (path: string) => {
      setPayload({
        ...payload,
        src: path
      })
    },
    [payload, setPayload]
  )

  const handleChangeLoop = useCallback(
    ({ target: { checked } }: React.ChangeEvent<HTMLInputElement>) => {
      setPayload({
        ...payload,
        loop: checked
      })
    },
    [payload, setPayload]
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
