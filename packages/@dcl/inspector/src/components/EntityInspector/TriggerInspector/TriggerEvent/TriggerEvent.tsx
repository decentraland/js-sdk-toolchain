import React from 'react'
import { VscTrash as RemoveIcon } from 'react-icons/vsc'
import { IoIosGitBranch as ConditionalIcon } from 'react-icons/io'
import { TriggerType } from '@dcl/asset-packs'
import { Block } from '../../../Block'
import { Button } from '../../../Button'
import { Dropdown } from '../../../ui/Dropdown'
import MoreOptionsMenu from '../../MoreOptionsMenu'

import type { Props } from './types'

import './TriggerEvent.css'

const TriggerMapOption: Record<string, string> = {
  [TriggerType.ON_CLICK]: 'On Click',
  [TriggerType.ON_INPUT_ACTION]: 'On Input Action',
  [TriggerType.ON_SPAWN]: 'On Spawn',
  [TriggerType.ON_STATE_CHANGE]: 'On State Change',
  [TriggerType.ON_COUNTER_CHANGE]: 'On Counter Change',
  [TriggerType.ON_TWEEN_END]: 'On Tween End',
  [TriggerType.ON_PLAYER_ENTERS_AREA]: 'Player Enters Area',
  [TriggerType.ON_PLAYER_LEAVES_AREA]: 'Player Leaves Area',
  [TriggerType.ON_DELAY]: 'On Delay',
  [TriggerType.ON_LOOP]: 'On Loop',
  [TriggerType.ON_CLONE]: 'On Clone',
  [TriggerType.ON_CLICK_IMAGE]: 'On Click Image',
  [TriggerType.ON_DAMAGE]: 'On Damage',
  [TriggerType.ON_GLOBAL_CLICK]: 'On Global Click',
  [TriggerType.ON_GLOBAL_PRIMARY]: 'On Global Primary',
  [TriggerType.ON_GLOBAL_SECONDARY]: 'On Global Secondary',
  [TriggerType.ON_TICK]: 'On Tick',
  [TriggerType.ON_HEAL_PLAYER]: 'On Heal Player'
}

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
      <Dropdown
        options={availableTriggers.map((availableTrigger) => ({
          label: TriggerMapOption[availableTrigger],
          value: availableTrigger
        }))}
        value={trigger.type}
        onChange={onChangeTriggerType}
      />
      {children}
    </Block>
  )
}

export default React.memo(TriggerEvent)
