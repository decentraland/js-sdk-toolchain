import React, { useCallback, useEffect, useState } from 'react'
import { ActionPayload, ActionType } from '@dcl/asset-packs'
import { Vector3 } from '@dcl/ecs-math'
import { recursiveCheck } from 'jest-matcher-deep-close-to/lib/recursiveCheck'
import { TextField } from '../../../ui'
import type { Props } from './types'

import './MovePlayerAction.css'

function isNumeric(value?: number) {
  return value !== undefined && !isNaN(value)
}

function isValid(
  payload: Partial<ActionPayload<ActionType.MOVE_PLAYER>>
): payload is ActionPayload<ActionType.MOVE_PLAYER> {
  if (
    payload.position !== undefined &&
    isNumeric(payload.position.x) &&
    isNumeric(payload.position.y) &&
    isNumeric(payload.position.z)
  ) {
    if (
      payload.cameraTarget === undefined ||
      (isNumeric(payload.cameraTarget.x) && isNumeric(payload.cameraTarget.y) && isNumeric(payload.cameraTarget.z))
    ) {
      return true
    }
  }

  return false
}

const MovePlayerAction: React.FC<Props> = ({ value, onUpdate }: Props) => {
  const [payload, setPayload] = useState<Partial<ActionPayload<ActionType.MOVE_PLAYER>>>({
    ...value
  })

  useEffect(() => {
    if (!recursiveCheck(payload, value, 2) || !isValid(payload)) return
    onUpdate(payload)
  }, [payload, onUpdate])

  const handleChangePositionX = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
      if (!value) return
      setPayload({
        ...payload,
        position: {
          ...(payload.position as Vector3),
          x: parseFloat(value)
        }
      })
    },
    [payload, setPayload]
  )

  const handleChangePositionY = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
      if (!value) return
      setPayload({
        ...payload,
        position: {
          ...(payload.position as Vector3),
          y: parseFloat(value)
        }
      })
    },
    [payload, setPayload]
  )

  const handleChangePositionZ = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
      if (!value) return
      setPayload({
        ...payload,
        position: {
          ...(payload.position as Vector3),
          z: parseFloat(value)
        }
      })
    },
    [payload, setPayload]
  )

  return (
    <div className="MovePlayerActionContainer">
      <div className="row">
        <TextField
          label="X"
          type="number"
          value={payload.position?.x}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChangePositionX(e)}
        />
        <TextField
          label="Y"
          type="number"
          value={payload.position?.y}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChangePositionY(e)}
        />
        <TextField
          label="Z"
          type="number"
          value={payload.position?.z}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChangePositionZ(e)}
        />
      </div>
    </div>
  )
}

export default React.memo(MovePlayerAction)
