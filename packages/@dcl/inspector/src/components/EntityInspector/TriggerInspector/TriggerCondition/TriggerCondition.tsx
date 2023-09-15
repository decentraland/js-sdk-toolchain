import React from 'react'
import { VscTrash as RemoveIcon } from 'react-icons/vsc'
import { TriggerConditionType } from '@dcl/asset-packs'

import Button from '../../../Button'
import { Dropdown } from '../../../Dropdown'
import MoreOptionsMenu from '../../MoreOptionsMenu'

import type { Props } from './types'

import './TriggerCondition.css'

export const TriggerCondition = ({
  condition,
  availableStates,
  onChangeEntity,
  onChangeConditionType,
  onChangeConditionValue,
  onRemoveTriggerCondition
}: Props) => {
  const isDisabled = !condition.entity || !availableStates.get(condition.entity)

  return (
    <div className="TriggerCondition">
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
        onChange={onChangeEntity}
      />
      <Dropdown
        disabled={isDisabled}
        options={Object.values(TriggerConditionType)}
        value={condition.type}
        onChange={onChangeConditionType}
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
        onChange={onChangeConditionValue}
      />
      <MoreOptionsMenu>
        <Button className="RemoveButton" onClick={onRemoveTriggerCondition}>
          <RemoveIcon /> Remove Trigger Condition
        </Button>
      </MoreOptionsMenu>
    </div>
  )
}

export default React.memo(TriggerCondition)
