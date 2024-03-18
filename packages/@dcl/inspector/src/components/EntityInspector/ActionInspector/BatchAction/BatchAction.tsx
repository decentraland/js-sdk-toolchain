import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ActionPayload, ActionType } from '@dcl/asset-packs'
import { recursiveCheck } from 'jest-matcher-deep-close-to/lib/recursiveCheck'
import { Block } from '../../../Block'
import { Dropdown } from '../../../ui'
import type { DropdownChangeEvent } from '../../../ui'
import type { Props } from './types'

import './BatchAction.css'

function isValid(payload: Partial<ActionPayload<ActionType.RANDOM>>): payload is ActionPayload<ActionType.RANDOM> {
  return payload.actions !== undefined && payload.actions.length > 0
}

const BatchAction: React.FC<Props> = ({ availableActions, value, onUpdate }: Props) => {
  const [payload, setPayload] = useState<Partial<ActionPayload<ActionType.RANDOM>>>({
    ...value
  })

  useEffect(() => {
    if (!recursiveCheck(payload, value, 2) || !isValid(payload)) return
    onUpdate(payload)
  }, [payload, onUpdate])

  const actions = useMemo(() => {
    return availableActions.map((action) => ({ value: action.name, label: action.name }))
  }, [availableActions])

  const handleChangeAction = useCallback(
    ({ target: { value } }: DropdownChangeEvent) => {
      setPayload({ ...payload, actions: value as any[] })
    },
    [payload, setPayload]
  )

  return (
    <div className="BatchActionContainer">
      <Block>
        <Dropdown label="Action(s)" options={actions} value={payload.actions} multiple onChange={handleChangeAction} />
      </Block>
    </div>
  )
}

export default BatchAction
