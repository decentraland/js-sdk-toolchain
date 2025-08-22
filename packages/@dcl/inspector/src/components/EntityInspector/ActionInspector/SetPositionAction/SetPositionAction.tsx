import React, { useCallback, useState } from 'react'
import { ActionPayload, ActionType } from '@dcl/asset-packs'
import { recursiveCheck } from 'jest-matcher-deep-close-to/lib/recursiveCheck'
import { CheckboxField, TextField } from '../../../ui'
import { Block } from '../../../Block'
import type { Props } from './types'

import './SetPositionAction.css'

function isValid(
  payload: Partial<ActionPayload<ActionType.SET_POSITION>>
): payload is ActionPayload<ActionType.SET_POSITION> {
  return (
    typeof payload.x === 'number' &&
    !isNaN(payload.x) &&
    typeof payload.y === 'number' &&
    !isNaN(payload.y) &&
    typeof payload.z === 'number' &&
    !isNaN(payload.z)
  )
}

const SetPositionAction: React.FC<Props> = ({ value, onUpdate }: Props) => {
  const [payload, setPayload] = useState<Partial<ActionPayload<ActionType.SET_POSITION>>>({
    ...value
  })

  const handleUpdate = useCallback(
    (_payload: Partial<ActionPayload<ActionType.SET_POSITION>>) => {
      setPayload(_payload)
      if (!recursiveCheck(_payload, value, 3) || !isValid(_payload)) return
      onUpdate(_payload)
    },
    [setPayload, value, onUpdate]
  )

  const handleChangeX = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
      const parsed = parseFloat(value)
      const actual = isNaN(parsed) ? ('' as any) : parsed
      handleUpdate({ ...payload, x: actual })
    },
    [payload, handleUpdate]
  )

  const handleChangeY = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
      const parsed = parseFloat(value)
      const actual = isNaN(parsed) ? ('' as any) : parsed
      handleUpdate({ ...payload, y: actual })
    },
    [payload, handleUpdate]
  )

  const handleChangeZ = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
      const parsed = parseFloat(value)
      const actual = isNaN(parsed) ? ('' as any) : parsed
      handleUpdate({ ...payload, z: actual })
    },
    [payload, handleUpdate]
  )

  const handleChangeRelative = useCallback(
    ({ target: { checked } }: React.ChangeEvent<HTMLInputElement>) => {
      handleUpdate({ ...payload, relative: checked })
    },
    [payload, handleUpdate]
  )

  return (
    <div className="SetPositionActionContainer">
      <div className="row">
        <Block label="Position">
          <TextField
            leftLabel="X"
            type="number"
            value={payload.x}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChangeX(e)}
            autoSelect
          />
          <TextField
            leftLabel="Y"
            type="number"
            value={payload.y}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChangeY(e)}
            autoSelect
          />
          <TextField
            leftLabel="Z"
            type="number"
            value={payload.z}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChangeZ(e)}
            autoSelect
          />
        </Block>
      </div>
      <div className="row">
        <Block label="Relative">
          <CheckboxField
            checked={payload.relative}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChangeRelative(e)}
          />
        </Block>
      </div>
    </div>
  )
}

export default React.memo(SetPositionAction)
