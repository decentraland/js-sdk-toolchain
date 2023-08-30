import { useCallback, useEffect, useMemo } from 'react'
import { Entity } from '@dcl/ecs'
import { Item } from 'react-contexify'
import { AiFillDelete as DeleteIcon, AiOutlinePlus as AddIcon, AiOutlineMinus as RemoveIcon } from 'react-icons/ai'

import { WithSdkProps, withSdk } from '../../../hoc/withSdk'
import { withContextMenu } from '../../../hoc/withContextMenu'
import { getComponentValue, useComponentValue } from '../../../hooks/sdk/useComponentValue'
import { useHasComponent } from '../../../hooks/sdk/useHasComponent'
import { useContextMenu } from '../../../hooks/sdk/useContextMenu'
import { useEntitiesWith } from '../../../hooks/sdk/useEntitiesWith'
import { EditorComponentsTypes } from '../../../lib/sdk/components'

import { Block } from '../../Block'
import { Container } from '../../Container'
import { ContextMenu } from '../../ContexMenu'
import { Dropdown } from '../../Dropdown'

import { Action, Actions as AvailableActions } from '../ActionInspector/types'
import { Trigger, Triggers as AvailableTriggers, Props } from './types'

import './TriggerInspector.css'

export default withSdk<Props>(
  withContextMenu<Props & WithSdkProps>(({ sdk, entity, contextMenuId }) => {
    const { operations } = sdk
    const { Actions, Triggers, Name } = sdk.components
    const entitiesWithAction = useEntitiesWith((components) => components.Actions)
    const [componentValue, setComponentValue] = useComponentValue<EditorComponentsTypes['Triggers']>(entity, Triggers)
    const { handleAction } = useContextMenu()
    const hasTriggers = useHasComponent(entity, Triggers)

    useEffect(() => {
      if (hasTriggers && componentValue.value.length === 0) {
        handleAddNewTrigger()
      }
    }, [hasTriggers])

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
      operations.removeComponent(entity, Triggers)
      await operations.dispatch()
    }, [operations])

    const handleAddNewTrigger = useCallback(() => {
      setComponentValue((prev: EditorComponentsTypes['Triggers']) => {
        return { value: [...prev.value, { type: AvailableTriggers.ON_CLICK }] }
      })
    }, [setComponentValue])

    const handleChangeType = useCallback(
      ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>, idx: number) => {
        setComponentValue((prev: EditorComponentsTypes['Triggers']) => {
          const data = [...prev.value]
          data[idx].type = value as AvailableTriggers
          return { value: data }
        })
      },
      [setComponentValue]
    )

    const handleChangeEnitty = useCallback(
      ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>, idx: number) => {
        setComponentValue((prev: EditorComponentsTypes['Triggers']) => {
          const data = [...prev.value]
          data[idx].entity = entitiesWithAction?.find((entity) => entity.toString() === value)
          return { value: data }
        })
      },
      [entitiesWithAction, setComponentValue]
    )

    const handleChangeAction = useCallback(
      ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>, idx: number) => {
        setComponentValue((prev: EditorComponentsTypes['Triggers']) => {
          const data = [...prev.value]
          data[idx].action = value as AvailableActions
          return { value: data }
        })
      },
      [setComponentValue]
    )

    const handleRemoveTrigger = useCallback((e: React.MouseEvent, idx: number) => {
      e.stopPropagation()
      setComponentValue((prev: EditorComponentsTypes['Triggers']) => {
        const data = [...prev.value]
        data.splice(idx, 1)
        return { value: data }
      })
    }, [])

    if (!hasTriggers) {
      return null
    }

    return (
      <Container label="Trigger" className="TriggerInspector">
        <ContextMenu id={contextMenuId}>
          <Item id="delete" onClick={handleAction(handleRemove)}>
            <DeleteIcon /> Delete
          </Item>
        </ContextMenu>
        {componentValue.value.map((trigger: Trigger, idx: number) => {
          return (
            <Block key={`trigger-${idx}`}>
              <Dropdown
                label={'Interaction'}
                options={Object.values(AvailableTriggers).filter((v) => isNaN(Number(v))) as string[]}
                value={trigger.type}
                onChange={(e) => handleChangeType(e, idx)}
              />
              <Dropdown
                label={'Entity'}
                options={
                  availableActions
                    ? [
                        { value: -1, text: 'Select an Entity' },
                        ...Array.from(availableActions).map(([entity, { name }]) => {
                          return { value: entity, text: name }
                        })
                      ]
                    : []
                }
                value={trigger.entity}
                onChange={(e) => handleChangeEnitty(e, idx)}
              />
              <Dropdown
                label={'Action'}
                disabled={!trigger.entity || !availableActions.get(trigger.entity)}
                options={
                  trigger.entity && availableActions.get(trigger.entity)?.action
                    ? [
                        { value: -1, text: 'Select an Action' },
                        ...(availableActions.get(trigger.entity)?.action ?? []).map(({ name }) => {
                          return { value: name, text: name }
                        })
                      ]
                    : []
                }
                value={trigger.action}
                onChange={(e) => handleChangeAction(e, idx)}
              />
              <button className="RemoveButton" onClick={(e) => handleRemoveTrigger(e, idx)}>
                <RemoveIcon />
              </button>
            </Block>
          )
        })}

        <button className="AddButton" onClick={handleAddNewTrigger}>
          <AddIcon />
        </button>
      </Container>
    )
  })
)
