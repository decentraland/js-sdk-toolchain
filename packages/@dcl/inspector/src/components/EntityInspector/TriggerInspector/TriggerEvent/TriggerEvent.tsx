import React from 'react'
import { TriggerType } from '@dcl/asset-packs'
import { VscAdd as AddIcon, VscTrash as RemoveIcon } from 'react-icons/vsc'

import { Block } from '../../../Block'
import { Button } from '../../../Button'
import { Dropdown } from '../../../Dropdown'
import MoreOptionsMenu from '../../MoreOptionsMenu'

import type { Props } from './types'

import './TriggerEvent.css'

export const TriggerEvent = ({
  trigger,
  onChangeTriggerType,
  onAddNewTriggerAction,
  onRemoveTriggerEvent,
  children
}: Props) => {
  return (
    <Block className="TriggerEventContainer">
      <div className="TriggerEventTitle">
        <span>Trigger Event</span>
        <div className="RightContent">
          <MoreOptionsMenu>
            <Button className="RemoveButton" onClick={onRemoveTriggerEvent}>
              <RemoveIcon /> Remove Trigger Event
            </Button>
          </MoreOptionsMenu>
        </div>
      </div>
      <Dropdown
        options={Object.values(TriggerType).filter((v) => isNaN(Number(v))) as string[]}
        value={trigger.type}
        onChange={onChangeTriggerType}
      />
      <div className="TriggerActionsTitle">
        <span>Assigned Actions</span>
        <div className="RightContent">
          <Button className="AddActionButton" onClick={onAddNewTriggerAction}>
            <AddIcon size={16} />
          </Button>
        </div>
      </div>
      <div className="TriggerActionsContainer">{children}</div>
    </Block>
  )
}

export default React.memo(TriggerEvent)
