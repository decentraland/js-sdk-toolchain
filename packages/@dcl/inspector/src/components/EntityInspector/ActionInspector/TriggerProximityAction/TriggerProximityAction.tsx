import React, { useCallback, useEffect, useState } from 'react'
import { ActionPayload, ActionType, ProximityLayer } from '@dcl/asset-packs'
import { recursiveCheck } from 'jest-matcher-deep-close-to/lib/recursiveCheck'
import { Dropdown, TextField } from '../../../ui'
import type { Props } from './types'

import './TriggerProximityAction.css'

function isValid(payload: Partial<ActionPayload<ActionType.DAMAGE>>): payload is ActionPayload<ActionType.DAMAGE> {
  return typeof payload.radius === 'number' && !isNaN(payload.radius)
}

const LayerOptions = [
  {
    value: ProximityLayer.ALL,
    label: 'All'
  },
  {
    value: ProximityLayer.PLAYER,
    label: 'Player'
  },
  {
    value: ProximityLayer.NON_PLAYER,
    label: 'Non Player'
  }
]

const TriggerProximityAction: React.FC<Props> = ({ value, onUpdate }: Props) => {
  const [payload, setPayload] = useState<Partial<ActionPayload<ActionType.DAMAGE>>>({
    ...value
  })

  useEffect(() => {
    if (!recursiveCheck(payload, value, 3) || !isValid(payload)) return
    onUpdate(payload)
  }, [payload, onUpdate])

  const handleChangeRadius = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
      setPayload({ ...payload, radius: parseFloat(value) })
    },
    [payload, setPayload]
  )

  const handleChangeHits = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
      setPayload({ ...payload, hits: parseInt(value) })
    },
    [payload, setPayload]
  )

  const handleChangeLayer = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>) => {
      setPayload({ ...payload, layer: value as ProximityLayer })
    },
    [payload, setPayload]
  )

  return (
    <div className="TriggerProximityActionContainer">
      <div className="row">
        <TextField
          label="Radius"
          type="number"
          value={payload.radius}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChangeRadius(e)}
        />
        <TextField
          label="Hits"
          type="number"
          value={payload.hits || 1}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChangeHits(e)}
        />
        <Dropdown
          label="Layer"
          options={LayerOptions}
          value={payload.layer || ProximityLayer.ALL}
          onChange={handleChangeLayer}
        />
      </div>
    </div>
  )
}

export default React.memo(TriggerProximityAction)
