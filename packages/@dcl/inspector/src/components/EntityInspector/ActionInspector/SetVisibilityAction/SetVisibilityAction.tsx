import React, { useCallback, useEffect, useState } from 'react'
import { ActionPayload, ActionType } from '@dcl/asset-packs'
import { recursiveCheck } from 'jest-matcher-deep-close-to/lib/recursiveCheck'
import { Block } from '../../../Block'
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
    <Block className="SetVisibilityActionContainer">
      <Dropdown
        label="Select Visibility"
        options={[
          { value: 'true', label: 'Visible' },
          { value: 'false', label: 'Invisible' }
        ]}
        value={(payload.visible ?? true).toString()}
        onChange={handleSetVisible}
      />

      <Dropdown
        label="Select Physics Collider"
        options={[
          { value: 'true', label: 'Enabled' },
          { value: 'false', label: 'Disabled' }
        ]}
        value={(payload.physicsCollider ?? false).toString()}
        onChange={handleChangeCollider}
      />
    </Block>
  )
}

export default React.memo(SetVisibilityAction)
