import React, { useCallback, useEffect } from 'react'
import { VscTrash as RemoveIcon } from 'react-icons/vsc'
import { Entity } from '@dcl/ecs'
import { TriggerCondition, TriggerConditionOperation, TriggerConditionType } from '@dcl/asset-packs'
import { useArrayState } from '../../../../hooks/useArrayState'
import { useSdk } from '../../../../hooks/sdk/useSdk'
import { Component } from '../../../../lib/sdk/components'
import { Button } from '../../../Button'
import { AddButton } from '../../AddButton'
import MoreOptionsMenu from '../../MoreOptionsMenu'
import { Dropdown, EntityField, TextField } from '../../../ui'
import {
  counterConditionTypeOptions,
  statesConditionTypeOptions,
  actionsConditionTypeOptions
} from '../TriggerInspector'
import type { Props } from './types'
import './TriggerCondition.css'

const SEPARATOR = '::'

export const TriggerConditionContainer = ({
  trigger,
  availableStates,
  availableConditions,
  onChangeOperation,
  onUpdateConditions
}: Props) => {
  const sdk = useSdk()
  const [conditions, addCondition, modifyCondition, removeCondition] = useArrayState<TriggerCondition>(
    trigger.conditions as TriggerCondition[]
  )
  const conditionOperation = [
    { value: TriggerConditionOperation.AND, label: 'All Conditions should be Met (AND)' },
    { value: TriggerConditionOperation.OR, label: 'Any Condition can be Met (OR)' }
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

  const handleChangeInputValue = useCallback(
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
            placeholder="Select an operation type"
            options={[...Array.from(conditionOperation).map(({ value, label }) => ({ value, label }))]}
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
        const conditionOptions = (entity && availableConditions.get(entity)?.conditions) || []
        const stateOptions = ((condition.id && availableStates.get(condition.id)?.states) || []).map((state) => ({
          value: state,
          label: state
        }))
        const isDisabled = conditionOptions.length === 0
        const isStatesCondition = statesConditionTypeOptions.some(($) => $.value === condition.type)
        const isCounterCondition = counterConditionTypeOptions.some(($) => $.value === condition.type)
        const isActionCondition = actionsConditionTypeOptions.some(($) => $.value === condition.type)
        return (
          <div className="TriggerCondition" key={`trigger-condition-${idx}`}>
            <div className="Fields">
              <EntityField
                components={[sdk?.components.States, sdk?.components.Counter, sdk?.components.Actions] as Component[]}
                value={entity}
                onChange={(e) => handleChangeEntity(e, idx)}
              />
              <Dropdown
                disabled={isDisabled}
                options={conditionOptions.map(({ text, value }) => ({
                  label: text,
                  value: [value.id, value.type].join(SEPARATOR)
                }))}
                value={type}
                onChange={(e) => handleChangeType(e, idx)}
              />
              {isStatesCondition && (
                <Dropdown
                  placeholder="Select a State"
                  disabled={isDisabled}
                  options={stateOptions.length > 0 ? [...stateOptions] : []}
                  value={condition.value}
                  onChange={(e) => handleChangeInputValue(e, idx)}
                />
              )}
              {isCounterCondition && (
                <TextField
                  disabled={isDisabled}
                  value={condition.value}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChangeInputValue(e, idx)}
                />
              )}
              {isActionCondition && (
                <TextField
                  disabled={isDisabled}
                  value={condition.value}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChangeInputValue(e, idx)}
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
