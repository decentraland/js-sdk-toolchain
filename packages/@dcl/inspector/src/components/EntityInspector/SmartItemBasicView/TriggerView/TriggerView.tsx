import React, { useCallback, useEffect, useMemo } from 'react'
import { Entity } from '@dcl/ecs'
import { Action, Trigger, TriggerAction, TriggerCondition } from '@dcl/asset-packs'
import { WithSdkProps, withSdk } from '../../../../hoc/withSdk'
import { getComponentValue, useComponentValue } from '../../../../hooks/sdk/useComponentValue'
import { useComponentsWith } from '../../../../hooks/sdk/useComponentsWith'
import { useEntitiesWith } from '../../../../hooks/sdk/useEntitiesWith'
import { useArrayState } from '../../../../hooks/useArrayState'
import { Component, ConfigComponent, EditorComponentsTypes } from '../../../../lib/sdk/components'
import { Container } from '../../../Container'
import { Dropdown, EntityField } from '../../../ui'
import MoreOptionsMenu from '../../MoreOptionsMenu'
import { RemoveButton } from '../../RemoveButton'
import { AddButton } from '../../AddButton'

export default React.memo(
  withSdk<WithSdkProps & { entity: Entity; field: ConfigComponent['fields'][0] }>(({ sdk, entity, field }) => {
    const { Config, Triggers, Actions, Name } = sdk.components
    const [triggerComponent, setTriggerComponentValue, isTriggerComponentEqual] = useComponentValue<
      EditorComponentsTypes['Triggers']
    >(entity, Triggers)
    const [triggers, , modifyTrigger] = useArrayState<Trigger>(triggerComponent === null ? [] : triggerComponent.value)
    const [_, getActionEntity, getActionValue] = useComponentsWith((components) => components.Actions)
    const entitiesWithAction: Entity[] = useEntitiesWith((components) => components.Actions)

    const getTrigger = useCallback(
      (basicViewId: string) => {
        return triggers.find((trigger) => trigger.basicViewId === basicViewId)
      },
      [triggers]
    )

    const trigger = useMemo(() => getTrigger(field.basicViewId!), [field, getTrigger])

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

    useEffect(() => {
      if (areValidTriggers(triggers) && !isTriggerComponentEqual({ value: triggers })) {
        setTriggerComponentValue({ value: [...triggers] })
      }
    }, [triggers])

    const availableActions: Map<number, { name: string; actions: Action[] }> = useMemo(() => {
      return entitiesWithAction?.reduce((actions, entityWithAction) => {
        const actionsComponentValue = getComponentValue(entityWithAction, Actions)
        const name = Name.getOrNull(entityWithAction)
        if (name && actionsComponentValue.value.length > 0) {
          const isBasicViewEnabled = Config.getOrNull(entityWithAction as Entity)?.isBasicViewEnabled === true
          const _actions = actionsComponentValue.value.filter((action) =>
            isBasicViewEnabled ? !!action.allowedInBasicView : true
          ) as Action[]
          actions.set(actionsComponentValue.id, { name: name.value, actions: _actions })
        }
        return actions
      }, new Map<number, { name: string; actions: Action[] }>())
    }, [entitiesWithAction])

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
          modifyTrigger(triggerIdx, {
            ...trigger,
            actions: trigger.actions.map((action, _idx) => {
              if (idx === _idx) {
                return { ...action, id: getActionValue(parseInt(value) as Entity)?.id }
              }
              return action
            })
          })
        }
      },
      [triggers, modifyTrigger]
    )

    const handleChangeAction = useCallback(
      ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>, idx: number, trigger: Trigger) => {
        const triggerIdx = triggers.findIndex((_trigger) => _trigger.basicViewId === trigger.basicViewId)
        if (triggerIdx !== -1) {
          modifyTrigger(triggerIdx, {
            ...trigger,
            actions: trigger.actions.map((action, _idx) => {
              if (idx === _idx) {
                return { ...action, name: value }
              }
              return action
            })
          })
        }
      },
      [triggers, modifyTrigger]
    )

    const handleRemoveAction = useCallback(
      (_: React.MouseEvent, idx: number, trigger: Trigger) => {
        const triggerIdx = triggers.findIndex((_trigger) => _trigger.basicViewId === trigger.basicViewId)
        if (triggerIdx !== -1) {
          modifyTrigger(triggerIdx, {
            ...trigger,
            actions: trigger.actions.filter((_action, _idx) => idx !== _idx)
          })
        }
      },
      [triggers, modifyTrigger]
    )

    if (trigger) {
      return (
        <Container label={field.name} border>
          <div className="TriggerActionContainer">
            {trigger.actions.map((action, idx) => {
              const actionId = action.id
              const actionEntity = getActionEntity(action)
              const isBasicViewEnabled = Config.getOrNull(actionEntity as Entity)?.isBasicViewEnabled === true
              if (
                isBasicViewEnabled &&
                actionId !== undefined &&
                action.name !== '' &&
                !availableActions.get(actionId)?.actions.find((_action) => _action.name === action.name)
              )
                return null

              const actions = actionId
                ? (availableActions.get(actionId)?.actions ?? []).map(({ name }) => ({
                    value: name,
                    label: name
                  }))
                : []

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
                      disabled={!action.id || !trigger.actions.find((_action) => _action.id === action.id)}
                      options={actions}
                      value={action.name}
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
            })}
            <AddButton onClick={(_e) => handleAddAction(trigger)}>Assign Action</AddButton>
          </div>
        </Container>
      )
    }

    return null
  })
)
