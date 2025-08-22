import React, { useCallback, useMemo, useState } from 'react'
import { ActionPayload, ActionType } from '@dcl/asset-packs'
import { recursiveCheck } from 'jest-matcher-deep-close-to/lib/recursiveCheck'
import { Block } from '../../../Block'
import { Dropdown, RangeField } from '../../../ui'
import type { DropdownChangeEvent } from '../../../ui'
import type { Props } from './types'

import './LoopAction.css'

function isStartLoopAction(
  payload: ActionPayload<ActionType.START_LOOP | ActionType.STOP_LOOP>
): payload is ActionPayload<ActionType.START_LOOP> {
  return 'actions' in payload
}

function isValid(payload: ActionPayload<ActionType.START_LOOP | ActionType.STOP_LOOP>) {
  if (isStartLoopAction(payload)) {
    return (
      payload.actions !== undefined &&
      payload.actions.length > 0 &&
      payload.interval !== undefined &&
      payload.interval > 0
    )
  }

  return (
    (payload as ActionPayload<ActionType.STOP_LOOP>).action !== undefined &&
    (payload as ActionPayload<ActionType.STOP_LOOP>).action !== ''
  )
}

const LoopAction = <T extends ActionPayload<ActionType.START_LOOP | ActionType.STOP_LOOP>>({
  availableActions,
  value,
  onUpdate
}: Props<T>) => {
  const [payload, setPayload] = useState<T>({
    ...value
  })

  const handleUpdate = useCallback(
    (_payload: T) => {
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
      if (isStartLoopAction(payload)) {
        handleUpdate({ ...payload, actions: value as any[] })
      } else {
        handleUpdate({ ...payload, action: value as any })
      }
    },
    [payload, handleUpdate]
  )

  const handleChangeInterval = useCallback(
    (e: React.ChangeEvent<HTMLElement>) => {
      const { value } = e.target as HTMLInputElement

      handleUpdate({ ...payload, interval: parseFloat(value) })
    },
    [payload, handleUpdate]
  )

  return (
    <div className="LoopActionContainer">
      {isStartLoopAction(payload) ? (
        <>
          <Block>
            <Dropdown
              label="Action(s)"
              options={actions}
              value={payload.actions}
              multiple
              onChange={handleChangeAction}
            />
          </Block>
          <Block>
            <RangeField
              step={0.1}
              label="Interval in Seconds"
              value={payload.interval}
              onChange={handleChangeInterval}
            />
          </Block>
        </>
      ) : (
        <Block>
          <Dropdown label="Action" options={actions} value={payload.action} onChange={handleChangeAction} />
        </Block>
      )}
    </div>
  )
}

export default LoopAction
