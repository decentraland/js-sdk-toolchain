import React, { useCallback, useState } from 'react'
import { ActionPayload, ActionType } from '@dcl/asset-packs'
import { recursiveCheck } from 'jest-matcher-deep-close-to/lib/recursiveCheck'
import { Block } from '../../../Block'
import { Dropdown, RangeField, TextField } from '../../../ui'
import { FONTS, TEXT_ALIGN_MODES } from '../../TextShapeInspector/utils'
import type { Props } from './types'

import './ShowTextAction.css'

function isValid(
  payload: Partial<ActionPayload<ActionType.SHOW_TEXT>>
): payload is ActionPayload<ActionType.SHOW_TEXT> {
  return payload.text !== '' && !!payload.hideAfterSeconds && payload.hideAfterSeconds > 0
}

const ShowTextAction: React.FC<Props> = ({ value, onUpdate }: Props) => {
  const [payload, setPayload] = useState<Partial<ActionPayload<ActionType.SHOW_TEXT>>>({
    ...value
  })

  const handleUpdate = useCallback(
    (_payload: Partial<ActionPayload<ActionType.SHOW_TEXT>>) => {
      setPayload(_payload)
      if (!recursiveCheck(_payload, value, 2) || !isValid(_payload)) return
      onUpdate(_payload)
    },
    [setPayload, value, onUpdate]
  )

  const handleChangeText = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
      handleUpdate({ ...payload, text: value })
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

  const handleChangeFont = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>) => {
      handleUpdate({ ...payload, font: parseInt(value) })
    },
    [payload, handleUpdate]
  )

  const handleChangeFontSize = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
      handleUpdate({ ...payload, fontSize: parseFloat(value) })
    },
    [payload, handleUpdate]
  )

  const handleChangeTextAlign = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>) => {
      handleUpdate({ ...payload, textAlign: parseInt(value) })
    },
    [payload, handleUpdate]
  )

  return (
    <div className="ShowTextActionContainer">
      <Block>
        <TextField autoSelect label="Text" type="text" value={payload.text} onChange={handleChangeText} />
      </Block>
      <Block>
        <RangeField
          label="Hide After Seconds"
          value={payload.hideAfterSeconds}
          onChange={handleChangeHideAfterSeconds}
          isValidValue={(value) => value > 0}
        />
      </Block>
      <Block label="Font">
        <Dropdown placeholder="Select a Font" options={FONTS} value={payload.font} onChange={handleChangeFont} />
      </Block>
      <Block label="Font Size">
        <TextField autoSelect type="number" value={payload.fontSize} onChange={handleChangeFontSize} />
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

export default React.memo(ShowTextAction)
