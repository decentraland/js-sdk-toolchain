import React, { useCallback, useMemo, useState } from 'react'
import { ActionPayload, ActionType } from '@dcl/asset-packs'
import { recursiveCheck } from 'jest-matcher-deep-close-to/lib/recursiveCheck'
import { useAppSelector } from '../../../../redux/hooks'
import { selectAssetCatalog } from '../../../../redux/app'
import { Block } from '../../../Block'
import { Dropdown, FileUploadField, InfoTooltip, RangeField, TextArea, TextField } from '../../../ui'
import { ACCEPTED_FILE_TYPES } from '../../../ui/FileUploadField/types'
import { TEXT_ALIGN_MODES as ALIGN_MODES } from '../../TextShapeInspector/utils'
import { isModel } from '../../MaterialInspector/Texture/utils'
import type { Props } from './types'

import './ShowImageAction.css'

function isValid(
  payload: Partial<ActionPayload<ActionType.SHOW_IMAGE>>
): payload is ActionPayload<ActionType.SHOW_IMAGE> {
  return payload.src !== undefined && payload.src !== '' && payload.height !== undefined && payload.width !== undefined
}

const ShowImageAction: React.FC<Props> = ({ value, onUpdate }: Props) => {
  const [payload, setPayload] = useState<Partial<ActionPayload<ActionType.SHOW_IMAGE>>>({
    ...value
  })

  const files = useAppSelector(selectAssetCatalog)

  const handleUpdate = useCallback(
    (_payload: Partial<ActionPayload<ActionType.SHOW_IMAGE>>) => {
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

  const handleChangeText = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLTextAreaElement>) => {
      handleUpdate({ ...payload, text: value })
    },
    [payload, handleUpdate]
  )

  const handleChangeHeight = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
      handleUpdate({ ...payload, height: parseFloat(value) })
    },
    [payload, handleUpdate]
  )

  const handleChangeWidth = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
      handleUpdate({ ...payload, width: parseFloat(value) })
    },
    [payload, handleUpdate]
  )

  const handleChangeHideAfterSeconds = useCallback(
    (e: React.ChangeEvent<HTMLElement>) => {
      const { value } = e.target as HTMLInputElement

      handleUpdate({ ...payload, hideAfterSeconds: parseFloat(value) })
    },
    [payload, handleUpdate]
  )

  const handleChangeFontSize = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
      handleUpdate({ ...payload, fontSize: parseFloat(value) })
    },
    [payload, handleUpdate]
  )

  const handleChangeAlign = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>) => {
      handleUpdate({ ...payload, align: parseInt(value) })
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
      <Block label="Size">
        <TextField autoSelect leftLabel="Height" type="number" value={payload.height} onChange={handleChangeHeight} />
        <TextField autoSelect leftLabel="Width" type="number" value={payload.width} onChange={handleChangeWidth} />
      </Block>
      <Block label="Align Image">
        <Dropdown
          placeholder="Select an Align Mode"
          options={ALIGN_MODES}
          value={payload.align}
          onChange={handleChangeAlign}
        />
      </Block>
      <Block>
        <RangeField
          label={
            <>
              Hide After Seconds{' '}
              <InfoTooltip
                text="The image will automatically disappear after the specified number of seconds. Enter 0 to keep the image visible indefinitely."
                type="info"
                position="top center"
              />
            </>
          }
          value={payload.hideAfterSeconds}
          onChange={handleChangeHideAfterSeconds}
        />
      </Block>
      <Block>
        <TextArea label="Text" value={payload.text} onChange={handleChangeText} />
      </Block>
      <Block label="Font Size">
        <TextField autoSelect type="number" value={payload.fontSize} onChange={handleChangeFontSize} />
      </Block>
    </div>
  )
}

export default React.memo(ShowImageAction)
