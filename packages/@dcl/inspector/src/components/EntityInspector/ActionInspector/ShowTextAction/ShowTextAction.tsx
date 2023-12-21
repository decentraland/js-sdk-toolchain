import React, { useCallback, useEffect, useState } from 'react'
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

  useEffect(() => {
    if (!recursiveCheck(payload, value, 2) || !isValid(payload)) return
    onUpdate(payload)
  }, [payload, onUpdate])

  const handleChangeText = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
      setPayload({ ...payload, text: value })
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

  const handleChangeFont = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>) => {
      setPayload({ ...payload, font: parseInt(value) })
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

  return (
    <div className="ShowTextActionContainer">
      <Block>
        <TextField label="Text" type="text" value={payload.text} onChange={handleChangeText} />
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

export default React.memo(ShowTextAction)
