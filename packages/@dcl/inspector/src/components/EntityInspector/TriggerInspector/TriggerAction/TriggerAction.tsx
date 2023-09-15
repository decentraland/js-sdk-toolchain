import React from 'react'
import { AiOutlinePlus as AddIcon } from 'react-icons/ai'
import { VscTrash as RemoveIcon } from 'react-icons/vsc'

import { Button } from '../../../Button'
import { Dropdown } from '../../../Dropdown'
import MoreOptionsMenu from '../../MoreOptionsMenu'

import type { Props } from './types'

import './TriggerAction.css'

export const TriggerAction = ({
  trigger,
  availableActions,
  onChangeEntity,
  onChangeAction,
  onAddTriggerAction,
  onRemoveTriggerAction
}: Props) => {
  return (
    <div className="TriggerActionsContainer">
      <div className="TriggerActionsTitle">
        <span>Assigned Actions</span>
        <div className="RightContent">
          <Button className="AddButton" onClick={onAddTriggerAction}>
            <AddIcon size={16} />
          </Button>
        </div>
      </div>
      {trigger.actions.map((action, idx) => {
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
              onChange={(e) => onChangeEntity(e, idx)}
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
              onChange={(e) => onChangeAction(e, idx)}
            />
            <MoreOptionsMenu>
              <Button className="RemoveButton" onClick={(e) => onRemoveTriggerAction(e, idx)}>
                <RemoveIcon /> Remove Trigger Action
              </Button>
            </MoreOptionsMenu>
          </div>
        )
      })}
    </div>
  )
}

export default React.memo(TriggerAction)
