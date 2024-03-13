/* eslint-disable no-console */
import React, { useCallback, useEffect, useState } from 'react'
import { ActionPayload, ActionType } from '@dcl/asset-packs'
import { recursiveCheck } from 'jest-matcher-deep-close-to/lib/recursiveCheck'
import { TextField } from '../../../ui'
import type { Props } from './types'
import { Block } from '../../../Block'

import './SetRotationAction.css'

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

const SetRotationAction: React.FC<Props> = ({ value, onUpdate }: Props) => {
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

  return (
    <div className="SetRotationActionContainer">
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
  )
}

export default React.memo(SetRotationAction)