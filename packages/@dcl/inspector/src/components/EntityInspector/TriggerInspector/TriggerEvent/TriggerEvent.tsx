import React from 'react'
import { VscTrash as RemoveIcon } from 'react-icons/vsc'
import { IoIosGitBranch as ConditionalIcon } from 'react-icons/io'
import { Block } from '../../../Block'
import { Button } from '../../../Button'
import { Dropdown } from '../../../Dropdown'
import MoreOptionsMenu from '../../MoreOptionsMenu'

import type { Props } from './types'

import './TriggerEvent.css'

export const TriggerEvent = ({
  trigger,
  availableTriggers,
  onChangeTriggerType,
  onAddNewTriggerCondition,
  onRemoveTriggerEvent,
  children
}: Props) => {
  return (
    <Block className="TriggerEventContainer">
      <div className="TriggerEventTitle">
        <span>Trigger Event</span>
        <div className="RightContent">
          <MoreOptionsMenu>
            <Button className="AddTriggerConditionButton" onClick={onAddNewTriggerCondition}>
              <ConditionalIcon /> Add Trigger Condition
            </Button>
            <Button className="RemoveButton" onClick={onRemoveTriggerEvent}>
              <RemoveIcon /> Remove Trigger Event
            </Button>
          </MoreOptionsMenu>
        </div>
      </div>
      <Dropdown options={availableTriggers} value={trigger.type} onChange={onChangeTriggerType} />
      {children}
    </Block>
  )
}

export default React.memo(TriggerEvent)
