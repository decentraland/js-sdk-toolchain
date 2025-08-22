import React, { useCallback, useMemo, useState } from 'react'
import { ActionPayload, ActionType } from '@dcl/asset-packs'
import { recursiveCheck } from 'jest-matcher-deep-close-to/lib/recursiveCheck'
import { Block } from '../../../Block'
import { Dropdown } from '../../../ui'
import type { DropdownChangeEvent } from '../../../ui'
import type { Props } from './types'

import './RandomAction.css'

function isValid(payload: Partial<ActionPayload<ActionType.RANDOM>>): payload is ActionPayload<ActionType.RANDOM> {
  return payload.actions !== undefined && payload.actions.length > 0
}

const RandomAction: React.FC<Props> = ({ availableActions, value, onUpdate }: Props) => {
  const [payload, setPayload] = useState<Partial<ActionPayload<ActionType.RANDOM>>>({
    ...value
  })

  const handleUpdate = useCallback(
    (_payload: Partial<ActionPayload<ActionType.RANDOM>>) => {
      setPayload(_payload)
      if (!recursiveCheck(_payload, value, 2) || !isValid(_payload)) return
      onUpdate(_payload)
    },
    [setPayload, value, onUpdate]
  )

  const actions = useMemo(() => {
    return availableActions.map((action) => ({ value: action.name, label: action.name }))
  }, [availableActions])

  const handleChangeAction = useCallback(
    ({ target: { value } }: DropdownChangeEvent) => {
      handleUpdate({ ...payload, actions: value as any[] })
    },
    [payload, handleUpdate]
  )

  return (
    <div className="RandomActionContainer">
      <Block>
        <Dropdown label="Action(s)" options={actions} value={payload.actions} multiple onChange={handleChangeAction} />
      </Block>
    </div>
  )
}

export default RandomAction
