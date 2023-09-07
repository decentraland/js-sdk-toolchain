import React from 'react'
import { VscTrash as RemoveIcon } from 'react-icons/vsc'

import Button from '../../../Button'
import { Dropdown } from '../../../Dropdown'
import MoreOptionsMenu from '../../MoreOptionsMenu'

import type { Props } from './types'

import './TriggerAction.css'

export const TriggerAction = ({
  action,
  availableActions,
  onChangeEntity,
  onChangeAction,
  onRemoveTriggerAction
}: Props) => {
  return (
    <div className="TriggerAction">
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
        onChange={onChangeEntity}
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
        onChange={onChangeAction}
      />
      <MoreOptionsMenu>
        <Button className="RemoveButton" onClick={onRemoveTriggerAction}>
          <RemoveIcon /> Remove Trigger Action
        </Button>
      </MoreOptionsMenu>
    </div>
  )
}

export default React.memo(TriggerAction)
