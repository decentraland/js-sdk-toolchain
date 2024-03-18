import React, { useCallback, useEffect, useState } from 'react'
import { ActionPayload, ActionType } from '@dcl/asset-packs'
import { recursiveCheck } from 'jest-matcher-deep-close-to/lib/recursiveCheck'
import { CheckboxField, TextField } from '../../../ui'
import { Block } from '../../../Block'
import type { Props } from './types'

import './FollowPlayerAction.css'

function isValid(
  payload: Partial<ActionPayload<ActionType.FOLLOW_PLAYER>>
): payload is ActionPayload<ActionType.FOLLOW_PLAYER> {
  return (
    typeof payload.speed === 'number' &&
    !isNaN(payload.speed) &&
    typeof payload.minDistance === 'number' &&
    !isNaN(payload.minDistance)
  )
}

const FollowPlayerAction: React.FC<Props> = ({ value, onUpdate }: Props) => {
  const [payload, setPayload] = useState<Partial<ActionPayload<ActionType.FOLLOW_PLAYER>>>({
    ...value
  })

  useEffect(() => {
    if (!recursiveCheck(payload, value, 3) || !isValid(payload)) return
    onUpdate(payload)
  }, [payload, onUpdate])

  const handleChangeSpeed = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
      setPayload({ ...payload, speed: parseFloat(value) })
    },
    [payload, setPayload]
  )

  const handleChangeMinDistance = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
      const parsed = parseFloat(value)
      if (!isNaN(parsed)) {
        setPayload({ ...payload, minDistance: parsed })
      }
    },
    [payload, setPayload]
  )

  const handleChangeX = useCallback(
    ({ target: { checked } }: React.ChangeEvent<HTMLInputElement>) => {
      setPayload({
        ...payload,
        x: checked
      })
    },
    [payload, setPayload]
  )

  const handleChangeY = useCallback(
    ({ target: { checked } }: React.ChangeEvent<HTMLInputElement>) => {
      setPayload({
        ...payload,
        y: checked
      })
    },
    [payload, setPayload]
  )

  const handleChangeZ = useCallback(
    ({ target: { checked } }: React.ChangeEvent<HTMLInputElement>) => {
      setPayload({
        ...payload,
        z: checked
      })
    },
    [payload, setPayload]
  )

  return (
    <div className="FollowPlayerActionContainer">
      <Block>
        <TextField
          label="Speed"
          type="text"
          value={payload.speed}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChangeSpeed(e)}
        />
        <TextField
          label="Min. Distance"
          type="text"
          value={payload.minDistance}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChangeMinDistance(e)}
        />
      </Block>
      <Block label="Axes">
        <CheckboxField
          label="X"
          checked={payload.x}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChangeX(e)}
        />
        <CheckboxField
          label="Y"
          checked={payload.y}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChangeY(e)}
        />
        <CheckboxField
          label="Z"
          checked={payload.z}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChangeZ(e)}
        />
      </Block>
    </div>
  )
}

export default React.memo(FollowPlayerAction)
