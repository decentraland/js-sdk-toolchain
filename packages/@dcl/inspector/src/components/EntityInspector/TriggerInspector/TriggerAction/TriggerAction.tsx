import React, { useCallback, useEffect } from 'react'
import { VscTrash as RemoveIcon } from 'react-icons/vsc'
import { TriggerAction } from '@dcl/asset-packs'
import { Entity } from '@dcl/ecs'
import { WithSdkProps, withSdk } from '../../../../hoc/withSdk'
import { useArrayState } from '../../../../hooks/useArrayState'
import { useComponentsWith } from '../../../../hooks/sdk/useComponentsWith'
import { Component } from '../../../../lib/sdk/components'
import { Button } from '../../../Button'
import { EntityField, Dropdown } from '../../../ui'
import { AddButton } from '../../AddButton'
import MoreOptionsMenu from '../../MoreOptionsMenu'

import type { Props } from './types'

import './TriggerAction.css'

const TriggerActionContainer: React.FC<WithSdkProps & Props> = ({ sdk, ...props }) => {
  const { trigger, availableActions, onUpdateActions } = props
  const [actions, addActions, modifyActions, removeActions] = useArrayState<TriggerAction>(
    trigger.actions as TriggerAction[]
  )
  const [_entitiesWithAction, getActionEntity, getActionValue] = useComponentsWith((components) => components.Actions)

  useEffect(() => {
    onUpdateActions(actions)
  }, [actions])

  const handleAddNewAction = useCallback(
    (_: React.MouseEvent) => {
      addActions({ id: undefined, name: '' })
    },
    [addActions]
  )

  const handleChangeEntity = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>, idx: number) => {
      modifyActions(idx, {
        ...actions[idx],
        id: getActionValue(parseInt(value) as Entity)?.id
      })
    },
    [actions, modifyActions]
  )

  const handleChangeAction = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>, idx: number) => {
      modifyActions(idx, {
        ...actions[idx],
        name: value
      })
    },
    [actions, modifyActions]
  )

  const handleRemoveAction = useCallback(
    (_: React.MouseEvent, idx: number) => {
      removeActions(idx)
    },
    [removeActions]
  )

  return (
    <div className="TriggerActionsContainer">
      <div className="TriggerActionsTitle">
        <span>Assigned Actions</span>
        <div className="RightContent">
          <AddButton onClick={handleAddNewAction} />
        </div>
      </div>
      {actions.map((action, idx) => {
        const actionEntity = getActionEntity(action)
        const isBasicViewEnabled = sdk.components.Config.getOrNull(actionEntity as Entity)?.isBasicViewEnabled === true
        const actions = action.id
          ? (
              availableActions
                .get(action.id)
                ?.actions.filter((_action) => (isBasicViewEnabled ? !!_action?.allowedInBasicView : true)) ?? []
            ).map(({ name }) => ({ value: name, label: name }))
          : []
        return (
          <div className="TriggerAction" key={`trigger-action-${idx}`}>
            <div className="Fields">
              <EntityField
                components={[sdk.components.Actions] as Component[]}
                value={actionEntity}
                onChange={(e) => handleChangeEntity(e, idx)}
              />
              <Dropdown
                placeholder="Select an Action"
                disabled={!action.id || !availableActions.get(action.id)}
                options={action.id && availableActions.get(action.id)?.actions ? [...actions] : []}
                value={action.name}
                onChange={(e) => handleChangeAction(e, idx)}
              />
            </div>
            <div className="RightMenu">
              <MoreOptionsMenu>
                <Button className="RemoveButton" onClick={(e) => handleRemoveAction(e, idx)}>
                  <RemoveIcon /> Remove Trigger Action
                </Button>
              </MoreOptionsMenu>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default React.memo(withSdk(TriggerActionContainer))
