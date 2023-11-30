import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ActionPayload, ActionType } from '@dcl/asset-packs'
import { recursiveCheck } from 'jest-matcher-deep-close-to/lib/recursiveCheck'
import { useAppSelector } from '../../../../redux/hooks'
import { selectAssetCatalog } from '../../../../redux/app'
import { Block } from '../../../Block'
import { Dropdown, FileUploadField, RangeField, TextField } from '../../../ui'
import { ACCEPTED_FILE_TYPES } from '../../../ui/FileUploadField/types'
import { TEXT_ALIGN_MODES } from '../../TextShapeInspector/utils'
import { isModel } from '../../MaterialInspector/Texture/utils'
import type { Props } from './types'

import './ShowImageAction.css'

function isValid(
  payload: Partial<ActionPayload<ActionType.SHOW_IMAGE>>
): payload is ActionPayload<ActionType.SHOW_IMAGE> {
  return payload.text !== '' && !!payload.hideAfterSeconds && payload.hideAfterSeconds > 0
}

const ShowImageAction: React.FC<Props> = ({ value, onUpdate }: Props) => {
  const [payload, setPayload] = useState<Partial<ActionPayload<ActionType.SHOW_IMAGE>>>({
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

  const handleChangeText = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
      setPayload({ ...payload, text: value })
    },
    [payload, setPayload]
  )

  const handleChangeHeight = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
      setPayload({ ...payload, height: parseFloat(value) })
    },
    [payload, setPayload]
  )

  const handleChangeWidth = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
      setPayload({ ...payload, width: parseFloat(value) })
    },
    [payload, setPayload]
  )

  const handleChangeHideAfterSeconds = useCallback(
    (e: React.ChangeEvent<HTMLElement>) => {
      const { value } = e.target as HTMLInputElement

      setPayload({ ...payload, hideAfterSeconds: parseFloat(value) })
    },
    [payload, setPayload]
  )

  const handleChangeFontSize = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
      setPayload({ ...payload, fontSize: parseFloat(value) })
    },
    [payload, setPayload]
  )

  const handleChangeTextAlign = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>) => {
      setPayload({ ...payload, textAlign: parseInt(value) })
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
    <div className="ShowImageActionContainer">
      <Block>
        <FileUploadField
          label="Path"
          value={payload.src}
          accept={ACCEPTED_FILE_TYPES['image']}
          onDrop={handleDrop}
          error={files && (!isValid || error)}
          isValidFile={isModel}
        />
      </Block>
      <Block>
        <TextField label="Text" type="text" value={payload.text} onChange={handleChangeText} />
      </Block>
      <Block label="Size">
        <TextField leftLabel="Height" type="number" value={payload.height} onChange={handleChangeHeight} />
        <TextField leftLabel="Width" type="number" value={payload.width} onChange={handleChangeWidth} />
      </Block>
      <Block>
        <RangeField
          label="Hide After Seconds"
          value={payload.hideAfterSeconds}
          onChange={handleChangeHideAfterSeconds}
          isValidValue={(value) => value > 0}
        />
      </Block>
      <Block label="Font Size">
        <TextField type="number" value={payload.fontSize} onChange={handleChangeFontSize} />
      </Block>
      <Block label="Text Align">
        <Dropdown
          placeholder="Select a Text Align Mode"
          options={TEXT_ALIGN_MODES}
          value={payload.textAlign}
          onChange={handleChangeTextAlign}
        />
      </Block>
    </div>
  )
}

export default React.memo(ShowImageAction)
