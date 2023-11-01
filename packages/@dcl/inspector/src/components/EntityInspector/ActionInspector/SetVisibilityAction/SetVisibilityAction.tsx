import React, { useCallback, useEffect, useState } from 'react'
import { ActionPayload, ActionType } from '@dcl/asset-packs'
import { recursiveCheck } from 'jest-matcher-deep-close-to/lib/recursiveCheck'

import { Dropdown } from '../../../ui/Dropdown'
import type { Props } from './types'

import './SetVisibilityAction.css'

function isValid(
  payload: Partial<ActionPayload<ActionType.SET_VISIBILITY>>
): payload is ActionPayload<ActionType.SET_VISIBILITY> {
  return payload.visible !== undefined
}

const SetVisibilityAction: React.FC<Props> = ({ value, onUpdate }: Props) => {
  const [payload, setPayload] = useState<Partial<ActionPayload<ActionType.SET_VISIBILITY>>>({
    ...value
  })

  useEffect(() => {
    if (!recursiveCheck(payload, value, 2) || !isValid(payload)) return
    onUpdate(payload)
  }, [payload, onUpdate])

  const handleSetVisible = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>) => {
      setPayload({ ...payload, visible: value === 'true' })
    },
    [payload, setPayload]
  )

  const handleChangeCollider = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>) => {
      setPayload({ ...payload, physicsCollider: value === 'true' })
    },
    [payload, setPayload]
  )

  return (
    <div className="SetVisibilityActionContainer">
      <div className="row">
        <div className="field">
          <label>Select Visibility</label>
          <Dropdown
            options={[
              { value: 'true', label: 'Visible' },
              { value: 'false', label: 'Invisible' }
            ]}
            value={(payload.visible ?? true).toString()}
            onChange={handleSetVisible}
          />
        </div>
      </div>
      <div className="row">
        <div className="field">
          <label>Select Physics Collider</label>
          <Dropdown
            options={[
              { value: 'true', label: 'Enabled' },
              { value: 'false', label: 'Disabled' }
            ]}
            value={(payload.physicsCollider ?? false).toString()}
            onChange={handleChangeCollider}
          />
        </div>
      </div>
    </div>
  )
}

export default React.memo(SetVisibilityAction)
