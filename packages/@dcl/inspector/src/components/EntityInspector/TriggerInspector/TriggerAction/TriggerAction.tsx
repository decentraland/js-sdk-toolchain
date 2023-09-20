import React, { useCallback, useEffect } from 'react'
import { VscTrash as RemoveIcon } from 'react-icons/vsc'
import { Entity } from '@dcl/ecs'
import { TriggerAction } from '@dcl/asset-packs'

import { useArrayState } from '../../../../hooks/useArrayState'

import { Button } from '../../../Button'
import { Dropdown } from '../../../Dropdown'
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
    (e: React.MouseEvent) => {
      addActions({ entity: undefined, name: '' })
    },
    [addActions]
  )

  const handleChangeEntity = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>, idx: number) => {
      modifyActions(idx, {
        ...actions[idx],
        entity: parseInt(value) as Entity
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
    (e: React.MouseEvent, idx: number) => {
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
        return (
          <div className="TriggerAction" key={`trigger-action-${idx}`}>
            <Dropdown
              options={
                availableActions
                  ? [
                      { value: '', text: 'Select an Entity' },
                      ...Array.from(availableActions).map(([entity, { name }]) => {
                        return { value: entity, text: name }
                      })
                    ]
                  : []
              }
              value={action.entity}
              onChange={(e) => handleChangeEntity(e, idx)}
            />
            <Dropdown
              disabled={!action.entity || !availableActions.get(action.entity)}
              options={
                action.entity && availableActions.get(action.entity)?.action
                  ? [
                      { value: '', text: 'Select an Action' },
                      ...(availableActions.get(action.entity)?.action ?? []).map(({ name }) => {
                        return { value: name, text: name }
                      })
                    ]
                  : []
              }
              value={action.name}
              onChange={(e) => handleChangeAction(e, idx)}
            />
            <MoreOptionsMenu>
              <Button className="RemoveButton" onClick={(e) => handleRemoveAction(e, idx)}>
                <RemoveIcon /> Remove Trigger Action
              </Button>
            </MoreOptionsMenu>
          </div>
        )
      })}
    </div>
  )
}

export default React.memo(TriggerActionContainer)
