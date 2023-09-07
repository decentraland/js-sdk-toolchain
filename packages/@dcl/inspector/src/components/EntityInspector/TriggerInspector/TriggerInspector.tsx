import { useCallback, useEffect, useMemo, useState } from 'react'
import { Entity } from '@dcl/ecs'
import { Action, Trigger, TriggerType, TriggerAction } from '@dcl/asset-packs'
import { Item } from 'react-contexify'
import { AiFillDelete as DeleteIcon, AiOutlinePlus as AddIcon } from 'react-icons/ai'
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
import TriggerActionContainer from './TriggerAction'

import type { Props } from './types'

import './TriggerInspector.css'

export default withSdk<Props>(
  withContextMenu<Props & WithSdkProps>(({ sdk, entity, contextMenuId }) => {
    const { Actions, Triggers, Name } = sdk.components
    const entitiesWithAction = useEntitiesWith((components) => components.Actions)
    const [componentValue, setComponentValue, isComponentEqual] = useComponentValue<EditorComponentsTypes['Triggers']>(
      entity,
      Triggers
    )
    const { handleAction } = useContextMenu()
    const [triggers, setTriggers] = useState<Trigger[]>(componentValue === null ? [] : componentValue.value)
    const hasTriggers = useHasComponent(entity, Triggers)

    const areValidAction = useCallback(
      (updatedActions: TriggerAction[]) =>
        updatedActions.length > 0 && !updatedActions.some((action) => !action.entity || !action.name),
      []
    )

    const areValidTriggers = useCallback(
      (updatedTriggers: Trigger[]) =>
        updatedTriggers.length > 0 &&
        !updatedTriggers.some((trigger) => !trigger.type || !areValidAction(trigger.actions as TriggerAction[])),
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
      return entitiesWithAction?.reduce((actions, entity) => {
        const action = getComponentValue(entity, Actions)
        const name = Name.get(entity)
        if (action.value.length > 0) {
          actions.set(entity, { name: name.value, action: action.value as Action[] })
        }

        return actions
      }, new Map<Entity, { name: string; action: Action[] }>())
    }, [entitiesWithAction])

    const handleRemove = useCallback(async () => {
      sdk.operations.removeComponent(entity, Triggers)
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

    const handleChangeEnitty = useCallback(
      ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>, triggerIdx: number, actionIdx: number) => {
        setTriggers((prev: Trigger[]) => {
          const data = [...prev]
          const actions = [...data[triggerIdx].actions]

          actions[actionIdx] = {
            ...actions[actionIdx],
            entity: entitiesWithAction?.find((entity) => entity.toString() === value)
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

    const handleChangeAction = useCallback(
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

    const handleRemoveTrigger = useCallback((e: React.MouseEvent, idx: number) => {
      e.stopPropagation()
      setTriggers((prev: Trigger[]) => {
        const data = [...prev]
        data.splice(idx, 1)
        return data
      })
    }, [])

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
              trigger={trigger}
              onChangeTriggerType={(e) => handleChangeType(e, triggerIdx)}
              onAddNewTriggerAction={(e) => handleAddNewTriggerAction(e, triggerIdx)}
              onRemoveTriggerEvent={(e) => handleRemoveTrigger(e, triggerIdx)}
            >
              {trigger.actions.map((action, actionIdx) => {
                return (
                  <TriggerActionContainer
                    action={action}
                    availableActions={availableActions}
                    onChangeEntity={(e) => handleChangeEnitty(e, triggerIdx, actionIdx)}
                    onChangeAction={(e) => handleChangeAction(e, triggerIdx, actionIdx)}
                    onRemoveTriggerAction={(e) => handleRemoveTriggerAction(e, triggerIdx, actionIdx)}
                  />
                )
              })}
            </TriggerEvent>
          )
        })}
        <button className="AddButton" onClick={handleAddNewTrigger}>
          <AddIcon size={16} /> Add New Trigger Event
        </button>
      </Container>
    )
  })
)
