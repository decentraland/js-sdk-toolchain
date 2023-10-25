import React, { useCallback, useEffect } from 'react'
import { VscTrash as RemoveIcon } from 'react-icons/vsc'
import { TriggerAction } from '@dcl/asset-packs'

import { useArrayState } from '../../../../hooks/useArrayState'

import { Button } from '../../../Button'
import { Dropdown } from '../../../ui/Dropdown'
import { AddButton } from '../../AddButton'
import MoreOptionsMenu from '../../MoreOptionsMenu'

import type { Props } from './types'

import './TriggerAction.css'

export const TriggerActionContainer = ({ trigger, availableActions, onUpdateActions }: Props) => {
  const [actions, addActions, modifyActions, removeActions] = useArrayState<TriggerAction>(
    trigger.actions as TriggerAction[]
  )

  useEffect(() => {
    onUpdateActions(actions)
  }, [actions])

  const handleAddNewAction = useCallback(
    (_: React.MouseEvent) => {
      addActions({ id: undefined, name: '' })
    },
    [addActions]
  )

  const handleChangeEntity = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>, idx: number) => {
      modifyActions(idx, {
        ...actions[idx],
        id: parseInt(value)
      })
    },
    [actions, modifyActions]
  )

  const handleChangeAction = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>, idx: number) => {
      modifyActions(idx, {
        ...actions[idx],
        name: value
      })
    },
    [actions, modifyActions]
  )

  const handleRemoveAction = useCallback(
    (_: React.MouseEvent, idx: number) => {
      removeActions(idx)
    },
    [removeActions]
  )

  return (
    <div className="TriggerActionsContainer">
      <div className="TriggerActionsTitle">
        <span>Assigned Actions</span>
        <div className="RightContent">
          <AddButton onClick={handleAddNewAction} />
        </div>
      </div>
      {actions.map((action, idx) => {
        const entities = Array.from(availableActions).map(([entity, { name }]) => {
          return { value: entity, label: name }
        })
        const actions = action.id
          ? (availableActions.get(action.id)?.actions ?? []).map(({ name }) => ({ value: name, label: name }))
          : []
        return (
          <div className="TriggerAction" key={`trigger-action-${idx}`}>
            <div className="Fields">
              <Dropdown
                options={availableActions ? [{ value: '', label: 'Select an Entity' }, ...entities] : []}
                value={action.id}
                onChange={(e) => handleChangeEntity(e, idx)}
              />
              <Dropdown
                disabled={!action.id || !availableActions.get(action.id)}
                options={
                  action.id && availableActions.get(action.id)?.actions
                    ? [{ value: '', label: 'Select an Action' }, ...actions]
                    : []
                }
                value={action.name}
                onChange={(e) => handleChangeAction(e, idx)}
              />
            </div>
            <div className="RightMenu">
              <MoreOptionsMenu>
                <Button className="RemoveButton" onClick={(e) => handleRemoveAction(e, idx)}>
                  <RemoveIcon /> Remove Trigger Action
                </Button>
              </MoreOptionsMenu>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default React.memo(TriggerActionContainer)
