import React, { useCallback, useState } from 'react'
import { ActionPayload, ActionType } from '@dcl/asset-packs'
import { recursiveCheck } from 'jest-matcher-deep-close-to/lib/recursiveCheck'
import { TextField } from '../../../ui'
import { Block } from '../../../Block'
import type { Props } from './types'

import './TeleportPlayerAction.css'

function isValid(
  payload: Partial<ActionPayload<ActionType.TELEPORT_PLAYER>>
): payload is ActionPayload<ActionType.TELEPORT_PLAYER> {
  return payload.x !== undefined && payload.y !== undefined && !isNaN(payload.x) && !isNaN(payload.y)
}

const TeleportPlayerAction: React.FC<Props> = ({ value, onUpdate }: Props) => {
  const [payload, setPayload] = useState<Partial<ActionPayload<ActionType.TELEPORT_PLAYER>>>({
    ...value
  })

  const handleUpdate = useCallback(
    (_payload: Partial<ActionPayload<ActionType.TELEPORT_PLAYER>>) => {
      setPayload(_payload)
      if (!recursiveCheck(_payload, value, 2) || !isValid(_payload)) return
      onUpdate(_payload)
    },
    [setPayload, value, onUpdate]
  )

  const handleChangeX = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
      handleUpdate({ ...payload, x: parseInt(value) })
    },
    [payload, handleUpdate]
  )

  const handleChangeY = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
      handleUpdate({ ...payload, y: parseInt(value) })
    },
    [payload, handleUpdate]
  )

  return (
    <div className="TeleportPlayerActionContainer">
      <Block label="Coordinates">
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
      </Block>
    </div>
  )
}

export default React.memo(TeleportPlayerAction)
