/* eslint-disable no-console */
import React, { useCallback, useEffect, useState } from 'react'
import { ActionPayload, ActionType } from '@dcl/asset-packs'
import { recursiveCheck } from 'jest-matcher-deep-close-to/lib/recursiveCheck'
import { TextField } from '../../../ui'
import type { Props } from './types'

import './TriggerProximityAction.css'

function isValid(
  payload: Partial<ActionPayload<ActionType.TRIGGER_PROXIMITY>>
): payload is ActionPayload<ActionType.TRIGGER_PROXIMITY> {
  return typeof payload.radius === 'number' && !isNaN(payload.radius)
}

const TriggerProximityAction: React.FC<Props> = ({ value, onUpdate }: Props) => {
  const [payload, setPayload] = useState<Partial<ActionPayload<ActionType.TRIGGER_PROXIMITY>>>({
    ...value
  })

  useEffect(() => {
    console.log('payload', payload)
    if (!recursiveCheck(payload, value, 3) || !isValid(payload)) return
    onUpdate(payload)
  }, [payload, onUpdate])

  const handleChangeRadius = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
      setPayload({ ...payload, radius: parseFloat(value) })
    },
    [payload, setPayload]
  )

  return (
    <div className="TriggerProximityActionContainer">
      <div className="row">
        <TextField
          label="Radius"
          type="text"
          value={payload.radius}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChangeRadius(e)}
        />
      </div>
    </div>
  )
}

export default React.memo(TriggerProximityAction)
