import React from 'react'
import { AiOutlinePlus as AddIcon } from 'react-icons/ai'
import { VscTrash as RemoveIcon } from 'react-icons/vsc'
import { TriggerConditionType } from '@dcl/asset-packs'

import Button from '../../../Button'
import { Dropdown } from '../../../Dropdown'
import MoreOptionsMenu from '../../MoreOptionsMenu'

import type { Props } from './types'

import './TriggerCondition.css'

export const TriggerCondition = ({
  trigger,
  availableStates,
  onChangeEntity,
  onChangeConditionType,
  onChangeConditionValue,
  onAddTriggerCondition,
  onRemoveTriggerCondition
}: Props) => {
  return (
    <div className="TriggerConditionsContainer">
      <div className="TriggerConditionsTitle">
        <span>Trigger Condition</span>
        <div className="RightContent">
          <Button className="AddButton" onClick={onAddTriggerCondition}>
            <AddIcon size={16} />
          </Button>
        </div>
      </div>
      {trigger.conditions!.map((condition, idx) => {
        const isDisabled = !condition.entity || !availableStates.get(condition.entity)
        return (
          <div className="TriggerCondition" key={`trigger-condition-${idx}`}>
            <Dropdown
              options={
                availableStates
                  ? [
                      { value: '', text: 'Select an Entity' },
                      ...Array.from(availableStates).map(([entity, { name }]) => ({ value: entity, text: name }))
                    ]
                  : []
              }
              value={condition.entity}
              onChange={(e) => onChangeEntity(e, idx)}
            />
            <Dropdown
              disabled={isDisabled}
              options={Object.values(TriggerConditionType)}
              value={condition.type}
              onChange={(e) => onChangeConditionType(e, idx)}
            />
            <Dropdown
              disabled={isDisabled}
              options={
                condition.entity && !!availableStates.get(condition.entity)
                  ? [
                      { value: '', text: 'Select state' },
                      ...Array.from(
                        (availableStates.get(condition.entity)?.state.value ?? []).map((state) => ({
                          value: state,
                          text: state
                        }))
                      )
                    ]
                  : []
              }
              value={condition.value}
              onChange={(e) => onChangeConditionValue(e, idx)}
            />
            <MoreOptionsMenu>
              <Button className="RemoveButton" onClick={(e) => onRemoveTriggerCondition(e, idx)}>
                <RemoveIcon /> Remove Trigger Condition
              </Button>
            </MoreOptionsMenu>
          </div>
        )
      })}
    </div>
  )
}

export default React.memo(TriggerCondition)
