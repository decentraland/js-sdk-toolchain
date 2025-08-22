import React, { useCallback, useMemo } from 'react'
import { Entity } from '@dcl/ecs'
import { Action, Trigger, TriggerAction, TriggerCondition } from '@dcl/asset-packs'
import { withSdk } from '../../../../../hoc/withSdk'
import { getComponentValue, useComponentValue } from '../../../../../hooks/sdk/useComponentValue'
import { useComponentsWith } from '../../../../../hooks/sdk/useComponentsWith'
import { useEntitiesWith } from '../../../../../hooks/sdk/useEntitiesWith'
import { useArrayState } from '../../../../../hooks/useArrayState'
import { Component, EditorComponentsTypes } from '../../../../../lib/sdk/components'
import { Container } from '../../../../Container'
import { Dropdown, EntityField } from '../../../../ui'
import MoreOptionsMenu from '../../../MoreOptionsMenu'
import { RemoveButton } from '../../../RemoveButton'
import { AddButton } from '../../../AddButton'
import { TriggerSectionProps } from './types'

const TriggerSection = withSdk<TriggerSectionProps>(({ sdk, entity, label, basicViewId }) => {
  const { Config, Triggers, Actions, Name } = sdk.components

  const [triggerComponent, setTriggerComponentValue, isTriggerComponentEqual] = useComponentValue<
    EditorComponentsTypes['Triggers']
  >(entity, Triggers)

  const [triggers, , modifyTrigger] = useArrayState<Trigger>(triggerComponent === null ? [] : triggerComponent.value)

  const [_, getActionEntity, getActionValue] = useComponentsWith((components) => components.Actions)
  const entitiesWithAction: Entity[] = useEntitiesWith((components) => components.Actions)

  const getTrigger = useCallback(
    (basicViewId: string) => triggers.find((trigger) => trigger.basicViewId === basicViewId),
    [triggers]
  )

  const trigger = useMemo(() => getTrigger(basicViewId || ''), [basicViewId, getTrigger])

  const areValidActions = useCallback(
    (updatedActions: TriggerAction[]) => updatedActions.every((action) => action.id && action.name),
    []
  )

  const areValidConditions = useCallback(
    (updatedConditions: TriggerCondition[] = []) =>
      updatedConditions.every((condition) => condition.id && condition.value),
    []
  )

  const areValidTriggers = useCallback(
    (updatedTriggers: Trigger[]) =>
      updatedTriggers.every(
        (trigger) =>
          trigger.type &&
          areValidActions(trigger.actions as TriggerAction[]) &&
          areValidConditions(trigger.conditions as TriggerCondition[] | undefined)
      ),
    []
  )

  const handleUpdateTrigger = useCallback(
    (updatedTriggers: Trigger[]) => {
      if (areValidTriggers(updatedTriggers) && !isTriggerComponentEqual({ value: updatedTriggers })) {
        setTriggerComponentValue({ value: [...updatedTriggers] })
      }
    },
    [areValidTriggers, isTriggerComponentEqual, setTriggerComponentValue]
  )

  const availableActions: Map<number, { name: string; actions: Action[] }> = useMemo(() => {
    if (!entitiesWithAction) return new Map()

    return entitiesWithAction.reduce((actions, entityWithAction) => {
      const actionsComponentValue = getComponentValue(entityWithAction, Actions)
      const name = Name.getOrNull(entityWithAction)

      if (name && actionsComponentValue.value.length > 0) {
        // Sort actions by priority: basic view enabled actions first, then others
        const sortedActions = [...actionsComponentValue.value].sort((a: any, b: any) => {
          const aAllowedInBasicView = a.allowedInBasicView || false
          const bAllowedInBasicView = b.allowedInBasicView || false

          if (aAllowedInBasicView === bAllowedInBasicView) return 0

          return aAllowedInBasicView ? -1 : 1
        }) as Action[]

        actions.set(actionsComponentValue.id, { name: name.value, actions: sortedActions })
      }
      return actions
    }, new Map<number, { name: string; actions: Action[] }>())
  }, [entitiesWithAction, Actions, Name, Config])

  const handleAddAction = useCallback(
    (trigger: Trigger) => {
      const triggerIdx = triggers.findIndex((_trigger) => _trigger.basicViewId === trigger.basicViewId)
      if (triggerIdx !== -1) {
        modifyTrigger(triggerIdx, {
          ...trigger,
          actions: [...trigger.actions, { id: undefined, name: '' }]
        })
      }
    },
    [triggers, modifyTrigger]
  )

  const handleChangeEntity = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>, idx: number, trigger: Trigger) => {
      const triggerIdx = triggers.findIndex((_trigger) => _trigger.basicViewId === trigger.basicViewId)
      if (triggerIdx !== -1) {
        const actionValue = getActionValue(parseInt(value) as Entity)
        modifyTrigger(
          triggerIdx,
          {
            ...trigger,
            actions: trigger.actions.map((action, _idx) => {
              if (idx === _idx) {
                return { ...action, id: actionValue?.id }
              }
              return action
            })
          },
          (updatedTriggers) => handleUpdateTrigger(updatedTriggers)
        )
      }
    },
    [triggers, modifyTrigger, getActionValue, handleUpdateTrigger]
  )

  const handleChangeAction = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>, idx: number, trigger: Trigger) => {
      const triggerIdx = triggers.findIndex((_trigger) => _trigger.basicViewId === trigger.basicViewId)
      if (triggerIdx !== -1) {
        modifyTrigger(
          triggerIdx,
          {
            ...trigger,
            actions: trigger.actions.map((action, _idx) => {
              if (idx === _idx) {
                return { ...action, name: value }
              }
              return action
            })
          },
          (updatedTriggers) => handleUpdateTrigger(updatedTriggers)
        )
      }
    },
    [triggers, modifyTrigger]
  )

  const handleRemoveAction = useCallback(
    (_: React.MouseEvent, idx: number, trigger: Trigger) => {
      const triggerIdx = triggers.findIndex((_trigger) => _trigger.basicViewId === trigger.basicViewId)
      if (triggerIdx !== -1) {
        modifyTrigger(
          triggerIdx,
          {
            ...trigger,
            actions: trigger.actions.filter((_action, _idx) => idx !== _idx)
          },
          (updatedTriggers) => handleUpdateTrigger(updatedTriggers)
        )
      }
    },
    [triggers, modifyTrigger]
  )

  const getActionOptions = useCallback(
    (actionId: number | undefined) => {
      if (!actionId) return []

      const actionData = availableActions.get(actionId)
      return (
        actionData?.actions.map(({ name }) => ({
          value: name,
          label: name
        })) || []
      )
    },
    [availableActions]
  )

  const renderAction = useCallback(
    (action: TriggerAction, idx: number) => {
      if (!trigger) return null

      const actionId = action.id
      const actionEntity = getActionEntity(action)

      const actions = getActionOptions(actionId)

      return (
        <div className="TriggerAction" key={`trigger-action-${idx}`}>
          <div className="Fields">
            <EntityField
              components={[sdk.components.Actions] as Component[]}
              value={actionEntity}
              onChange={(e) => handleChangeEntity(e, idx, trigger)}
            />
            <Dropdown
              placeholder="Action"
              options={actions}
              value={action.name}
              searchable
              onChange={(e) => handleChangeAction(e, idx, trigger)}
            />
          </div>
          <div className="RightMenu">
            <MoreOptionsMenu>
              <RemoveButton onClick={(e) => handleRemoveAction(e, idx, trigger)}>Remove Action</RemoveButton>
            </MoreOptionsMenu>
          </div>
        </div>
      )
    },
    [
      getActionEntity,
      Config,
      availableActions,
      getActionOptions,
      trigger,
      handleChangeEntity,
      handleChangeAction,
      handleRemoveAction,
      sdk.components.Actions
    ]
  )

  if (!trigger) {
    return null
  }

  return (
    <Container label={label || 'Trigger Actions'} border>
      <div className="TriggerActionContainer">
        {trigger.actions.map(renderAction)}
        <AddButton onClick={(_e) => handleAddAction(trigger)}>Assign Action</AddButton>
      </div>
    </Container>
  )
})

export default React.memo(TriggerSection)
