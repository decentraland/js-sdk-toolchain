import React, { useCallback, useEffect, useState } from 'react'
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

  useEffect(() => {
    if (!recursiveCheck(payload, value, 3) || !isValid(payload)) return
    onUpdate(payload)
  }, [payload, onUpdate])

  const handleChangeX = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
      const parsed = parseFloat(value)
      const actual = isNaN(parsed) ? ('' as any) : parsed
      setPayload({ ...payload, x: actual })
    },
    [payload, setPayload]
  )

  const handleChangeY = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
      const parsed = parseFloat(value)
      const actual = isNaN(parsed) ? ('' as any) : parsed
      setPayload({ ...payload, y: actual })
    },
    [payload, setPayload]
  )

  const handleChangeZ = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
      const parsed = parseFloat(value)
      const actual = isNaN(parsed) ? ('' as any) : parsed
      setPayload({ ...payload, z: actual })
    },
    [payload, setPayload]
  )

  const handleChangeRelative = useCallback(
    ({ target: { checked } }: React.ChangeEvent<HTMLInputElement>) => {
      setPayload({ ...payload, relative: checked })
    },
    [payload, setPayload]
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
          />
          <TextField
            leftLabel="Y"
            type="number"
            value={payload.y}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChangeY(e)}
          />
          <TextField
            leftLabel="Z"
            type="number"
            value={payload.z}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChangeZ(e)}
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
