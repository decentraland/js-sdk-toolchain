import { useCallback, useEffect, useMemo } from 'react'
import { Entity } from '@dcl/ecs'
import {
  Action,
  Trigger,
  TriggerType,
  TriggerAction,
  TriggerConditionOperation,
  TriggerConditionType,
  States,
  TriggerCondition
} from '@dcl/asset-packs'
import { Item } from 'react-contexify'
import { AiFillDelete as DeleteIcon } from 'react-icons/ai'
import { VscQuestion as QuestionIcon } from 'react-icons/vsc'
import { Popup } from 'decentraland-ui/dist/components/Popup/Popup'

import { WithSdkProps, withSdk } from '../../../hoc/withSdk'
import { withContextMenu } from '../../../hoc/withContextMenu'
import { useArrayState } from '../../../hooks/useArrayState'
import { getComponentValue, useComponentValue } from '../../../hooks/sdk/useComponentValue'
import { useHasComponent } from '../../../hooks/sdk/useHasComponent'
import { useContextMenu } from '../../../hooks/sdk/useContextMenu'
import { useEntitiesWith } from '../../../hooks/sdk/useEntitiesWith'
import { EditorComponentsTypes } from '../../../lib/sdk/components'

import { Container } from '../../Container'
import { ContextMenu } from '../../ContexMenu'
import { AddButton } from '../AddButton'

import { TriggerEvent } from './TriggerEvent'
import { TriggerConditionContainer } from './TriggerCondition'
import { TriggerActionContainer } from './TriggerAction'

import type { Props } from './types'

import './TriggerInspector.css'

export default withSdk<Props>(
  withContextMenu<Props & WithSdkProps>(({ sdk, entity: entityId, contextMenuId }) => {
    const { Actions, Triggers, Name, States } = sdk.components
    const entitiesWithAction: Entity[] = useEntitiesWith((components) => components.Actions)
    const entitiesWithState: Entity[] = useEntitiesWith((components) => components.States)
    const [componentValue, setComponentValue, isComponentEqual] = useComponentValue<EditorComponentsTypes['Triggers']>(
      entityId,
      Triggers
    )
    const { handleAction } = useContextMenu()

    const [triggers, addTrigger, modifyTrigger, removeTrigger] = useArrayState<Trigger>(
      componentValue === null ? [] : componentValue.value
    )

    const hasTriggers = useHasComponent(entityId, Triggers)

    const areValidActions = useCallback(
      (updatedActions: TriggerAction[]) =>
        updatedActions.length > 0 && updatedActions.every((action) => action.entity && action.name),
      []
    )

    const areValidConditions = useCallback(
      (updatedConditions: TriggerCondition[] | undefined) =>
        updatedConditions && updatedConditions.length > 0
          ? updatedConditions.every((condition) => condition.entity && condition.value)
          : true,
      []
    )

    const areValidTriggers = useCallback(
      (updatedTriggers: Trigger[]) =>
        updatedTriggers.length > 0 &&
        updatedTriggers.every(
          (trigger) =>
            trigger.type &&
            areValidActions(trigger.actions as TriggerAction[]) &&
            areValidConditions(trigger.conditions as TriggerCondition[] | undefined)
        ),
      []
    )

    useEffect(() => {
      if (areValidTriggers(triggers)) {
        if (isComponentEqual({ value: triggers })) {
          return
        }

        setComponentValue({ value: [...triggers] })
      }
    }, [triggers])

    const availableActions: Map<Entity, { name: string; action: Action[] }> = useMemo(() => {
      return entitiesWithAction?.reduce((actions, entityWithAction) => {
        const action = getComponentValue(entityWithAction, Actions)
        const name = Name.get(entityWithAction)
        if (action.value.length > 0) {
          actions.set(entityWithAction, { name: name.value, action: action.value as Action[] })
        }

        return actions
      }, new Map<Entity, { name: string; action: Action[] }>())
    }, [entitiesWithAction])

    const availableStates: Map<Entity, { name: string; states: States['value'] }> = useMemo(() => {
      return entitiesWithState?.reduce((states, entityWithState) => {
        const state = getComponentValue(entityWithState, States)
        const name = Name.get(entityWithState)
        if (state.value.length > 0) {
          states.set(entityWithState, { name: name.value, states: (state as States).value })
        }

        return states
      }, new Map<Entity, { name: string; states: States['value'] }>())
    }, [entitiesWithState])

    const handleRemove = useCallback(async () => {
      sdk.operations.removeComponent(entityId, Triggers)
      await sdk.operations.dispatch()
    }, [])

    const handleAddNewTrigger = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation()
        addTrigger({
          type: TriggerType.ON_CLICK,
          conditions: [],
          operation: TriggerConditionOperation.AND,
          actions: [
            {
              entity: undefined,
              name: ''
            }
          ]
        })
      },
      [addTrigger]
    )

    const handleRemoveTrigger = useCallback(
      (e: React.MouseEvent, idx: number) => {
        e.stopPropagation()
        removeTrigger(idx)
      },
      [removeTrigger]
    )

    const handleChangeType = useCallback(
      ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>, idx: number) => {
        modifyTrigger(idx, {
          ...triggers[idx],
          type: value as TriggerType
        })
      },
      [triggers, modifyTrigger]
    )

    const handleAddNewTriggerAction = useCallback(
      (e: React.MouseEvent, idx: number) => {
        e.stopPropagation()
        modifyTrigger(idx, {
          ...triggers[idx],
          actions: [...triggers[idx].actions, { entity: undefined, name: '' }]
        })
      },
      [triggers, modifyTrigger]
    )

    const handleUpdateActions = useCallback(
      (actions: TriggerAction[], triggerIdx: number) => {
        modifyTrigger(triggerIdx, {
          ...triggers[triggerIdx],
          actions
        })
      },
      [triggers, modifyTrigger]
    )

    const handleAddNewTriggerCondition = useCallback(
      (e: React.MouseEvent, idx: number) => {
        modifyTrigger(idx, {
          ...triggers[idx],
          conditions: [
            ...(triggers[idx].conditions ?? []),
            { entity: undefined, type: TriggerConditionType.WHEN_STATE_IS, value: '' }
          ]
        })
      },
      [triggers, modifyTrigger]
    )

    const handleUpdateConditions = useCallback(
      (conditions: TriggerCondition[], triggerIdx: number) => {
        modifyTrigger(triggerIdx, {
          ...triggers[triggerIdx],
          conditions
        })
      },
      [triggers, modifyTrigger]
    )

    const handleChangeOperation = useCallback(
      ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>, idx: number) => {
        modifyTrigger(idx, {
          ...triggers[idx],
          operation: value as TriggerConditionOperation
        })
      },
      [triggers, modifyTrigger]
    )

    if (!hasTriggers) {
      return null
    }

    const renderMoreInfo = () => {
      return (
        <Popup
          content={
            <>
              Learn more about this feature in the <a href="">docs</a>.
            </>
          }
          trigger={<QuestionIcon size={16} />}
          position="right center"
          on="hover"
          hideOnScroll
          hoverable
        />
      )
    }

    return (
      <Container label="Trigger" className="TriggerInspector" rightContent={renderMoreInfo()}>
        <ContextMenu id={contextMenuId}>
          <Item id="delete" onClick={handleAction(handleRemove)}>
            <DeleteIcon /> Delete
          </Item>
        </ContextMenu>
        {triggers.map((trigger: Trigger, triggerIdx: number) => {
          return (
            <TriggerEvent
              key={`trigger-${triggerIdx}`}
              trigger={trigger}
              onChangeTriggerType={(e) => handleChangeType(e, triggerIdx)}
              onAddNewTriggerAction={(e) => handleAddNewTriggerAction(e, triggerIdx)}
              onAddNewTriggerCondition={(e) => handleAddNewTriggerCondition(e, triggerIdx)}
              onRemoveTriggerEvent={(e) => handleRemoveTrigger(e, triggerIdx)}
            >
              <>
                {trigger.conditions && trigger.conditions.length > 0 ? (
                  <TriggerConditionContainer
                    trigger={trigger}
                    availableStates={availableStates}
                    onChangeOperation={(e) => handleChangeOperation(e, triggerIdx)}
                    onUpdateConditions={(conditions: TriggerCondition[]) =>
                      handleUpdateConditions(conditions, triggerIdx)
                    }
                  />
                ) : null}
                <TriggerActionContainer
                  trigger={trigger}
                  availableActions={availableActions}
                  onUpdateActions={(actions: TriggerAction[]) => handleUpdateActions(actions, triggerIdx)}
                />
              </>
            </TriggerEvent>
          )
        })}
        <AddButton onClick={handleAddNewTrigger}>Add New Trigger Event</AddButton>
      </Container>
    )
  })
)
