/* eslint-disable no-console */
import React, { useCallback, useEffect } from 'react'
import { VscTrash as RemoveIcon } from 'react-icons/vsc'
import { TriggerCondition, TriggerConditionOperation, TriggerConditionType } from '@dcl/asset-packs'
import { useArrayState } from '../../../../hooks/useArrayState'
import { Button } from '../../../Button'
import { Dropdown } from '../../../Dropdown'
import { AddButton } from '../../AddButton'
import MoreOptionsMenu from '../../MoreOptionsMenu'
import type { Props } from './types'
import './TriggerCondition.css'
import { TextField } from '../../TextField'
import { Entity } from '@dcl/ecs'
import { counterConditionTypeOptions, statesConditionTypeOptions } from '../TriggerInspector'

const SEPARATOR = '::'

export const TriggerConditionContainer = ({
  trigger,
  availableStates,
  availableConditions,
  onChangeOperation,
  onUpdateConditions
}: Props) => {
  const [conditions, addCondition, modifyCondition, removeCondition] = useArrayState<TriggerCondition>(
    trigger.conditions as TriggerCondition[]
  )
  const conditionOperation = [
    { value: TriggerConditionOperation.AND, text: 'All Conditions should be Met (AND)' },
    { value: TriggerConditionOperation.OR, text: 'Any Condition can be Met (OR)' }
  ]

  useEffect(() => {
    onUpdateConditions(conditions)
  }, [conditions])

  const handleAddNewCondition = useCallback(
    (_event: React.MouseEvent) => {
      addCondition({ id: undefined, type: TriggerConditionType.WHEN_STATE_IS, value: '' })
    },
    [addCondition]
  )

  const handleChangeEntity = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>, idx: number) => {
      const entity = parseInt(value) as Entity // value is a string when coming from the dropdown and we need to parse it to a number
      const { conditions: _conditions } = availableConditions.get(entity)!
      const { id, type } = _conditions[0].value
      modifyCondition(idx, {
        ...conditions[idx],
        id,
        type
      })
    },
    [conditions, availableConditions, modifyCondition]
  )

  const handleChangeType = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>, idx: number) => {
      const [id, type] = value.split(SEPARATOR)
      modifyCondition(idx, {
        ...conditions[idx],
        id: parseInt(id),
        type: type as TriggerConditionType
      })
    },
    [conditions, modifyCondition]
  )

  const handleChangeSelectValue = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>, idx: number) => {
      modifyCondition(idx, {
        ...conditions[idx],
        value
      })
    },
    [conditions, modifyCondition]
  )

  const handleRemoveCondition = useCallback(
    (_e: React.MouseEvent, idx: number) => {
      removeCondition(idx)
    },
    [removeCondition]
  )

  return (
    <div className="TriggerConditionsContainer">
      <div className="TriggerConditionsTitle">
        <span>Trigger Condition</span>
        <div className="RightContent">
          <AddButton onClick={handleAddNewCondition} />
        </div>
      </div>
      {conditions.length >= 2 ? (
        <div className="TriggerOperation">
          <Dropdown
            options={[
              { value: '', text: 'Select an operation type' },
              ...Array.from(conditionOperation).map(({ value, text }) => ({ value, text }))
            ]}
            value={trigger.operation}
            onChange={onChangeOperation}
          />
        </div>
      ) : null}
      {conditions.map((condition, idx) => {
        let entity: Entity | undefined = undefined
        let type: string | undefined = undefined
        for (const [_entity, { conditions }] of Array.from(availableConditions)) {
          for (const { value } of conditions) {
            if (condition.id === value.id && condition.type === value.type) {
              entity = _entity
              type = [value.id, value.type].join(SEPARATOR)
            }
          }
        }
        const entityOptions = Array.from(availableConditions).map(([entityId, { name }]) => ({
          value: entityId,
          text: name
        }))
        const conditionOptions = (entity && availableConditions.get(entity)?.conditions) || []
        const stateOptions = ((condition.id && availableStates.get(condition.id)?.states) || []).map((state) => ({
          value: state,
          text: state
        }))
        const isDisabled = conditionOptions.length === 0
        const isStatesCondition = statesConditionTypeOptions.some(($) => $.value === condition.type)
        const isCounterCondition = counterConditionTypeOptions.some(($) => $.value === condition.type)
        return (
          <div className="TriggerCondition" key={`trigger-condition-${idx}`}>
            <div className="Fields">
              <Dropdown
                options={entityOptions ? [{ value: '', text: 'Select an Entity' }, ...entityOptions] : []}
                value={entity}
                onChange={(e) => handleChangeEntity(e, idx)}
              />
              <Dropdown
                disabled={isDisabled}
                options={conditionOptions.map(({ text, value }) => ({
                  text,
                  value: [value.id, value.type].join(SEPARATOR)
                }))}
                value={type}
                onChange={(e) => handleChangeType(e, idx)}
              />
              {isStatesCondition && (
                <Dropdown
                  disabled={isDisabled}
                  options={stateOptions.length > 0 ? [{ value: '', text: 'Select state' }, ...stateOptions] : []}
                  value={condition.value}
                  onChange={(e) => handleChangeSelectValue(e, idx)}
                />
              )}
              {isCounterCondition && (
                <TextField
                  disabled={isDisabled}
                  value={condition.value}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChangeSelectValue(e, idx)}
                />
              )}
            </div>
            <div className="RightMenu">
              <MoreOptionsMenu>
                <Button className="RemoveButton" onClick={(e) => handleRemoveCondition(e, idx)}>
                  <RemoveIcon /> Remove Trigger Condition
                </Button>
              </MoreOptionsMenu>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default React.memo(TriggerConditionContainer)
