import React, { useCallback, useEffect, useMemo } from 'react'
import { AiOutlinePlus as AddIcon } from 'react-icons/ai'
import { VscTrash as RemoveIcon } from 'react-icons/vsc'
import { Entity } from '@dcl/ecs'
import { TriggerCondition, TriggerConditionType } from '@dcl/asset-packs'
import Button from '../../../Button'
import { Dropdown } from '../../../Dropdown'
import MoreOptionsMenu from '../../MoreOptionsMenu'
import { useArrayState } from '../../../../hooks/useArrayState'
import type { Props } from './types'
import './TriggerCondition.css'

export const TriggerConditionContainer = ({ trigger, availableStates, onUpdateConditions }: Props) => {
  const [conditions, addCondition, modifyCondition, removeCondition] = useArrayState<TriggerCondition>(
    trigger.conditions as TriggerCondition[]
  )
  const conditionTypeOptions = [
    { value: TriggerConditionType.WHEN_STATE_IS, text: 'is' },
    { value: TriggerConditionType.WHEN_STATE_IS_NOT, text: 'is not' }
  ]

  useEffect(() => {
    onUpdateConditions(conditions)
  }, [conditions])

  const handleAddNewCondition = useCallback(
    (e: React.MouseEvent) => {
      addCondition({ entity: undefined, type: TriggerConditionType.WHEN_STATE_IS, value: '' })
    },
    [addCondition]
  )

  const handleChangeEntity = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>, idx: number) => {
      modifyCondition(idx, {
        ...conditions[idx],
        entity: parseInt(value) as Entity // value is a string when coming from the dropdown and we need to parse it to a number
      })
    },
    [conditions, modifyCondition]
  )

  const handleChangeType = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>, idx: number) => {
      modifyCondition(idx, {
        ...conditions[idx],
        type: value as TriggerConditionType
      })
    },
    [conditions, modifyCondition]
  )

  const handleChangeValue = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>, idx: number) => {
      modifyCondition(idx, {
        ...conditions[idx],
        value
      })
    },
    [conditions, modifyCondition]
  )

  const handleRemoveCondition = useCallback(
    (e: React.MouseEvent, idx: number) => {
      removeCondition(idx)
    },
    [removeCondition]
  )

  return (
    <div className="TriggerConditionsContainer">
      <div className="TriggerConditionsTitle">
        <span>Trigger Condition</span>
        <div className="RightContent">
          <Button className="AddButton" onClick={handleAddNewCondition}>
            <AddIcon size={16} />
          </Button>
        </div>
      </div>
      {conditions.map((condition, idx) => {
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
              onChange={(e) => handleChangeEntity(e, idx)}
            />
            <Dropdown
              disabled={isDisabled}
              options={conditionTypeOptions}
              value={condition.type}
              onChange={(e) => handleChangeType(e, idx)}
            />
            <Dropdown
              disabled={isDisabled}
              options={
                condition.entity && availableStates.get(condition.entity)
                  ? [
                      { value: '', text: 'Select state' },
                      ...Array.from(
                        availableStates.get(condition.entity)!.states.map((state) => ({
                          value: state,
                          text: state
                        }))
                      )
                    ]
                  : []
              }
              value={condition.value}
              onChange={(e) => handleChangeValue(e, idx)}
            />
            <MoreOptionsMenu>
              <Button className="RemoveButton" onClick={(e) => handleRemoveCondition(e, idx)}>
                <RemoveIcon /> Remove Trigger Condition
              </Button>
            </MoreOptionsMenu>
          </div>
        )
      })}
    </div>
  )
}

export default React.memo(TriggerConditionContainer)
