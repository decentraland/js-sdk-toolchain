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
  TriggerCondition,
  ComponentName
} from '@dcl/asset-packs'

import { withSdk } from '../../../hoc/withSdk'
import { useArrayState } from '../../../hooks/useArrayState'
import { getComponentValue, useComponentValue } from '../../../hooks/sdk/useComponentValue'
import { useHasComponent } from '../../../hooks/sdk/useHasComponent'
import { useEntitiesWith } from '../../../hooks/sdk/useEntitiesWith'
import { analytics, Event } from '../../../lib/logic/analytics'
import { getAssetByModel } from '../../../lib/logic/catalog'
import { EditorComponentsTypes } from '../../../lib/sdk/components'

import { Container } from '../../Container'
import { AddButton } from '../AddButton'
import { InfoTooltip } from '../../ui/InfoTooltip'

import { TriggerEvent } from './TriggerEvent'
import { TriggerConditionContainer } from './TriggerCondition'
import { TriggerActionContainer } from './TriggerAction'

import type { Props } from './types'

import './TriggerInspector.css'

export const statesConditionTypeOptions = [
  { value: TriggerConditionType.WHEN_STATE_IS, text: 'state is' },
  { value: TriggerConditionType.WHEN_STATE_IS_NOT, text: 'state is not' },
  { value: TriggerConditionType.WHEN_PREVIOUS_STATE_IS, text: 'previous state is' },
  { value: TriggerConditionType.WHEN_PREVIOUS_STATE_IS_NOT, text: 'previous state is not' }
]

export const counterConditionTypeOptions = [
  { value: TriggerConditionType.WHEN_COUNTER_EQUALS, text: 'counter equals' },
  { value: TriggerConditionType.WHEN_COUNTER_IS_GREATER_THAN, text: 'counter is greater than' },
  { value: TriggerConditionType.WHEN_COUNTER_IS_LESS_THAN, text: 'counter is less than' }
]

export const actionsConditionTypeOptions = [
  { value: TriggerConditionType.WHEN_DISTANCE_TO_PLAYER_LESS_THAN, text: 'distance to player is less than' },
  { value: TriggerConditionType.WHEN_DISTANCE_TO_PLAYER_GREATER_THAN, text: 'distance to player is greater than' }
]

export default withSdk<Props>(({ sdk, entity: entityId }) => {
  const { Actions, Triggers, Name, States, Counter, GltfContainer } = sdk.components
  const entitiesWithAction: Entity[] = useEntitiesWith((components) => components.Actions)
  const entitiesWithStates: Entity[] = useEntitiesWith((components) => components.States)
  const entitiesWithCounter: Entity[] = useEntitiesWith((components) => components.Counter)
  const [componentValue, setComponentValue, isComponentEqual] = useComponentValue<EditorComponentsTypes['Triggers']>(
    entityId,
    Triggers
  )

  const [triggers, addTrigger, modifyTrigger, removeTrigger] = useArrayState<Trigger>(
    componentValue === null ? [] : componentValue.value
  )

  const hasTriggers = useHasComponent(entityId, Triggers)
  const hasStates = useHasComponent(entityId, States)
  const hasCounter = useHasComponent(entityId, Counter)

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

  const availableActions: Map<number, { name: string; actions: Action[] }> = useMemo(() => {
    return entitiesWithAction?.reduce((actions, entityWithAction) => {
      const actionsComponentValue = getComponentValue(entityWithAction, Actions)
      const name = Name.getOrNull(entityWithAction)?.value ?? entitiesWithAction.toString()
      if (actionsComponentValue.value.length > 0) {
        actions.set(actionsComponentValue.id, { name: name, actions: actionsComponentValue.value as Action[] })
      }

      return actions
    }, new Map<number, { name: string; actions: Action[] }>())
  }, [entitiesWithAction])

  const availableTriggers = useMemo(() => {
    const triggerTypes: TriggerType[] = [
      TriggerType.ON_SPAWN,
      TriggerType.ON_CLICK,
      TriggerType.ON_INPUT_ACTION,
      TriggerType.ON_PLAYER_ENTERS_AREA,
      TriggerType.ON_PLAYER_LEAVES_AREA,
      TriggerType.ON_TWEEN_END,
      TriggerType.ON_DELAY,
      TriggerType.ON_LOOP,
      TriggerType.ON_CLONE,
      TriggerType.ON_CLICK_IMAGE,
      TriggerType.ON_DAMAGE,
      TriggerType.ON_GLOBAL_CLICK,
      TriggerType.ON_GLOBAL_PRIMARY,
      TriggerType.ON_GLOBAL_SECONDARY,
      TriggerType.ON_TICK,
      TriggerType.ON_HEAL_PLAYER
    ]
    if (hasStates) {
      triggerTypes.push(TriggerType.ON_STATE_CHANGE)
    }
    if (hasCounter) {
      triggerTypes.push(TriggerType.ON_COUNTER_CHANGE)
    }
    return triggerTypes
  }, [hasStates, hasCounter])

  const availableStates: Map<number, { name: string; states: States['value'] }> = useMemo(() => {
    return entitiesWithStates?.reduce((states, entityWithState) => {
      const statesComponentValue = getComponentValue(entityWithState, States)
      const name = Name.getOrNull(entityWithState)?.value ?? entityWithState.toString()
      if (statesComponentValue.value.length > 0) {
        states.set(statesComponentValue.id, { name: name, states: (statesComponentValue as States).value })
      }

      return states
    }, new Map<number, { name: string; states: States['value'] }>())
  }, [entitiesWithStates])

  const availableConditions = useMemo(() => {
    const entities = Array.from(
      new Set<Entity>([...entitiesWithStates, ...entitiesWithCounter, ...entitiesWithAction])
    ).filter((entity) => entity !== 0)
    const result = new Map<
      Entity,
      {
        name: string
        conditions: { value: { id: number; type: TriggerConditionType }; text: string }[]
      }
    >()

    for (const entity of entities) {
      const name = Name.getOrNull(entity)?.value ?? entity.toString()
      const entityConditions: {
        name: string
        conditions: { value: { id: number; type: TriggerConditionType }; text: string }[]
      } = {
        name,
        conditions: []
      }
      result.set(entity, entityConditions)
      if (States.has(entity)) {
        const { id } = States.get(entity)
        for (const option of statesConditionTypeOptions) {
          entityConditions.conditions.push({ value: { id, type: option.value }, text: option.text })
        }
      }
      if (Counter.has(entity)) {
        const { id } = Counter.get(entity)
        for (const option of counterConditionTypeOptions) {
          entityConditions.conditions.push({ value: { id, type: option.value }, text: option.text })
        }
      }
      if (Actions.has(entity)) {
        for (const option of actionsConditionTypeOptions) {
          const { id } = Actions.get(entity)
          entityConditions.conditions.push({ value: { id, type: option.value }, text: option.text })
        }
      }
    }
    return result
  }, [entitiesWithStates, entitiesWithCounter, Actions, States, Counter, Name])

  const handleRemove = useCallback(async () => {
    sdk.operations.removeComponent(entityId, Triggers)
    await sdk.operations.dispatch()
    const gltfContainer = getComponentValue(entityId, GltfContainer)
    const asset = getAssetByModel(gltfContainer.src)
    analytics.track(Event.REMOVE_COMPONENT, {
      componentName: ComponentName.TRIGGERS,
      itemId: asset?.id,
      itemPath: gltfContainer.src
    })
  }, [])

  const handleAddNewTrigger = useCallback(
    (_e: React.MouseEvent) => {
      addTrigger({
        type: TriggerType.ON_CLICK,
        conditions: [],
        operation: TriggerConditionOperation.AND,
        actions: [
          {
            id: undefined,
            name: ''
          }
        ]
      })
    },
    [addTrigger]
  )

  const handleRemoveTrigger = useCallback(
    (_e: React.MouseEvent, idx: number) => {
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
    (_e: React.MouseEvent, idx: number) => {
      modifyTrigger(idx, {
        ...triggers[idx],
        actions: [...triggers[idx].actions, { id: undefined, name: '' }]
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
    (_e: React.MouseEvent, idx: number) => {
      modifyTrigger(idx, {
        ...triggers[idx],
        conditions: [
          ...(triggers[idx].conditions ?? []),
          { id: undefined, type: TriggerConditionType.WHEN_STATE_IS, value: '' }
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

  return (
    <Container
      label="Trigger"
      className="TriggerInspector"
      rightContent={
        <InfoTooltip
          text={`Triggers activate actions based on player interactions like clicks, entering/exiting areas, or global events like "on spawn".`}
          link="https://docs.decentraland.org/creator/smart-items/#triggers"
          type="help"
        />
      }
      onRemoveContainer={handleRemove}
    >
      {triggers.map((trigger: Trigger, triggerIdx: number) => {
        return (
          <TriggerEvent
            key={`trigger-${triggerIdx}`}
            trigger={trigger}
            availableTriggers={availableTriggers}
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
                  availableConditions={availableConditions}
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
