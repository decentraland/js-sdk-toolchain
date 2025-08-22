import React, { useCallback, useMemo, useState } from 'react'
import { ActionPayload, ActionType } from '@dcl/asset-packs'
import { recursiveCheck } from 'jest-matcher-deep-close-to/lib/recursiveCheck'
import { Block } from '../../../Block'
import { Dropdown, RangeField } from '../../../ui'
import type { DropdownChangeEvent } from '../../../ui'
import type { Props } from './types'

import './DelayAction.css'

function isStartDelayAction(
  payload: ActionPayload<ActionType.START_DELAY | ActionType.STOP_DELAY>
): payload is ActionPayload<ActionType.START_DELAY> {
  return 'actions' in payload
}

function isValid(payload: ActionPayload<ActionType.START_DELAY | ActionType.STOP_DELAY>) {
  if (isStartDelayAction(payload)) {
    return (
      payload.actions !== undefined &&
      payload.actions.length > 0 &&
      payload.timeout !== undefined &&
      payload.timeout > 0
    )
  }

  return (
    (payload as ActionPayload<ActionType.STOP_DELAY>).action !== undefined &&
    (payload as ActionPayload<ActionType.STOP_DELAY>).action !== ''
  )
}

const DelayAction = <T extends ActionPayload<ActionType.START_DELAY | ActionType.STOP_DELAY>>({
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
      if (isStartDelayAction(payload)) {
        handleUpdate({ ...payload, actions: value as any[] })
      } else {
        handleUpdate({ ...payload, action: value as any })
      }
    },
    [payload, handleUpdate]
  )

  const handleChangeDelay = useCallback(
    (e: React.ChangeEvent<HTMLElement>) => {
      const { value } = e.target as HTMLInputElement

      handleUpdate({ ...payload, timeout: parseFloat(value) })
    },
    [payload, handleUpdate]
  )

  return (
    <div className="DelayActionContainer">
      {isStartDelayAction(payload) ? (
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
            <RangeField step={0.1} label="Delay in Seconds" value={payload.timeout} onChange={handleChangeDelay} />
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

export default DelayAction
