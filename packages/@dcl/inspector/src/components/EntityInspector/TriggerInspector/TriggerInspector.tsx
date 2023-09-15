import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { getComponentValue, useComponentValue } from '../../../hooks/sdk/useComponentValue'
import { useHasComponent } from '../../../hooks/sdk/useHasComponent'
import { useContextMenu } from '../../../hooks/sdk/useContextMenu'
import { useEntitiesWith } from '../../../hooks/sdk/useEntitiesWith'
import { EditorComponentsTypes } from '../../../lib/sdk/components'

import { Container } from '../../Container'
import { ContextMenu } from '../../ContexMenu'

import TriggerEvent from './TriggerEvent'
import TriggerConditionContainer from './TriggerCondition'
import TriggerActionContainer from './TriggerAction'

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
    const [triggers, setTriggers] = useState<Trigger[]>(componentValue === null ? [] : componentValue.value)

    const hasTriggers = useHasComponent(entityId, Triggers)

    const areValidActions = useCallback(
      (updatedActions: TriggerAction[]) =>
        updatedActions.length > 0 && updatedActions.every((action) => action.entity && action.name),
      []
    )

    const areValidConditions = useCallback(
      (updatedConditions: TriggerCondition[] | undefined) =>
        updatedConditions
          ? updatedConditions.length > 0 && updatedConditions.every((condition) => condition.entity && condition.value)
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

    const availableStates: any = useMemo(() => {
      return entitiesWithState?.reduce((states, entityWithState) => {
        const state = getComponentValue(entityWithState, States)
        const name = Name.get(entityWithState)
        if (state.value.length > 0) {
          states.set(entityWithState, { name: name.value, state: state.value } as States)
        }

        return states
      }, new Map<Entity, { name: string; state: States }>())
    }, [entitiesWithState])

    const handleRemove = useCallback(async () => {
      sdk.operations.removeComponent(entityId, Triggers)
      await sdk.operations.dispatch()
    }, [])

    const handleAddNewTrigger = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation()
        setTriggers((prev: Trigger[]) => {
          return [
            ...prev,
            {
              type: TriggerType.ON_CLICK,
              conditions: [],
              operation: TriggerConditionOperation.AND,
              actions: [
                {
                  entity: undefined,
                  name: ''
                }
              ]
            }
          ]
        })
      },
      [setTriggers]
    )

    const handleRemoveTrigger = useCallback((e: React.MouseEvent, idx: number) => {
      e.stopPropagation()
      setTriggers((prev: Trigger[]) => {
        const data = [...prev]
        data.splice(idx, 1)
        return data
      })
    }, [])

    const handleAddNewTriggerAction = useCallback(
      (e: React.MouseEvent, idx: number) => {
        setTriggers((prev: Trigger[]) => {
          const data = [...prev]
          data[idx] = {
            ...data[idx],
            actions: [...data[idx].actions, { entity: undefined, name: '' }]
          }
          return data
        })
      },
      [setTriggers]
    )

    const handleChangeType = useCallback(
      ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>, idx: number) => {
        setTriggers((prev: Trigger[]) => {
          const data = [...prev]
          data[idx] = {
            ...data[idx],
            type: value as TriggerType
          }
          return data
        })
      },
      [setTriggers]
    )

    const handleChangeTriggerActionEnitty = useCallback(
      ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>, triggerIdx: number, actionIdx: number) => {
        setTriggers((prev: Trigger[]) => {
          const data = [...prev]
          const actions = [...data[triggerIdx].actions]

          actions[actionIdx] = {
            ...actions[actionIdx],
            entity: entitiesWithAction?.find((entityWithAction) => entityWithAction.toString() === value)
          }

          data[triggerIdx] = {
            ...data[triggerIdx],
            actions: [...actions]
          }

          return data
        })
      },
      [entitiesWithAction, setTriggers]
    )

    const handleChangeTriggerAction = useCallback(
      ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>, triggerIdx: number, actionIdx: number) => {
        setTriggers((prev: Trigger[]) => {
          const data = [...prev]
          const actions = [...data[triggerIdx].actions]

          actions[actionIdx] = {
            ...actions[actionIdx],
            name: value
          }

          data[triggerIdx] = {
            ...data[triggerIdx],
            actions: [...actions]
          }

          return data
        })
      },
      [setTriggers]
    )

    const handleRemoveTriggerAction = useCallback((e: React.MouseEvent, triggerIdx: number, actionIdx: number) => {
      e.stopPropagation()
      setTriggers((prev: Trigger[]) => {
        const data = [...prev]
        data[triggerIdx] = {
          ...data[triggerIdx],
          actions: [...data[triggerIdx].actions.slice(0, actionIdx)]
        }
        return data
      })
    }, [])

    const handleAddNewTriggerConditions = useCallback(
      (e: React.MouseEvent, idx: number) => {
        setTriggers((prev: Trigger[]) => {
          const data = [...prev]
          data[idx] = {
            ...data[idx],
            conditions: [
              ...(data[idx].conditions ?? []),
              { entity: undefined, type: TriggerConditionType.WHEN_STATE_IS, value: '' }
            ]
          }
          return data
        })
      },
      [setTriggers]
    )

    const handleChangeTriggerConditionsEntity = useCallback(
      ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>, triggerIdx: number, conditionIdx: number) => {
        setTriggers((prev: Trigger[]) => {
          const data = [...prev]
          const conditions = Array.from(data[triggerIdx].conditions as TriggerCondition[])

          conditions[conditionIdx] = {
            ...conditions[conditionIdx],
            entity: entitiesWithAction?.find((entityWithAction) => entityWithAction.toString() === value)
          }

          data[triggerIdx] = {
            ...data[triggerIdx],
            conditions: [...conditions]
          }

          return data
        })
      },
      [entitiesWithAction, setTriggers]
    )

    const handleChangeTriggerConditionType = useCallback(
      ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>, triggerIdx: number, conditionIdx: number) => {
        setTriggers((prev: Trigger[]) => {
          const data = [...prev]
          const conditions = Array.from(data[triggerIdx].conditions as TriggerCondition[])

          conditions[conditionIdx] = {
            ...conditions[conditionIdx],
            type: value as TriggerConditionType
          }

          data[triggerIdx] = {
            ...data[triggerIdx],
            conditions: [...conditions]
          }

          return data
        })
      },
      [entitiesWithAction, setTriggers]
    )

    const handleChangeTriggerConditionValue = useCallback(
      ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>, triggerIdx: number, conditionIdx: number) => {
        setTriggers((prev: Trigger[]) => {
          const data = [...prev]
          const conditions = Array.from(data[triggerIdx].conditions as TriggerCondition[])

          conditions[conditionIdx] = {
            ...conditions[conditionIdx],
            value: value
          }

          data[triggerIdx] = {
            ...data[triggerIdx],
            conditions: [...conditions]
          }

          return data
        })
      },
      [setTriggers]
    )

    const handleRemoveTriggerCondition = useCallback(
      (e: React.MouseEvent, triggerIdx: number, conditionIdx: number) => {
        e.stopPropagation()
        setTriggers((prev: Trigger[]) => {
          const data = [...prev]
          data[triggerIdx] = {
            ...data[triggerIdx],
            conditions: [...(data[triggerIdx].conditions as TriggerCondition[]).slice(0, conditionIdx)]
          }
          return data
        })
      },
      []
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
              onAddNewTriggerCondition={(e) => handleAddNewTriggerConditions(e, triggerIdx)}
              onRemoveTriggerEvent={(e) => handleRemoveTrigger(e, triggerIdx)}
            >
              <>
                {trigger.conditions && trigger.conditions.length > 0 ? (
                  <TriggerConditionContainer
                    trigger={trigger}
                    availableStates={availableStates}
                    onChangeEntity={(e, conditionIdx) =>
                      handleChangeTriggerConditionsEntity(e, triggerIdx, conditionIdx)
                    }
                    onChangeConditionType={(e, conditionIdx) =>
                      handleChangeTriggerConditionType(e, triggerIdx, conditionIdx)
                    }
                    onChangeConditionValue={(e, conditionIdx) =>
                      handleChangeTriggerConditionValue(e, triggerIdx, conditionIdx)
                    }
                    onAddTriggerCondition={(e) => handleAddNewTriggerConditions(e, triggerIdx)}
                    onRemoveTriggerCondition={(e, conditionIdx) =>
                      handleRemoveTriggerCondition(e, triggerIdx, conditionIdx)
                    }
                  />
                ) : null}
                <TriggerActionContainer
                  trigger={trigger}
                  availableActions={availableActions}
                  onChangeEntity={(e, actionIdx) => handleChangeTriggerActionEnitty(e, triggerIdx, actionIdx)}
                  onChangeAction={(e, actionIdx) => handleChangeTriggerAction(e, triggerIdx, actionIdx)}
                  onAddTriggerAction={(e) => handleAddNewTriggerAction(e, triggerIdx)}
                  onRemoveTriggerAction={(e, actionIdx) => handleRemoveTriggerAction(e, triggerIdx, actionIdx)}
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
