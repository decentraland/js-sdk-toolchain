import { useCallback, useEffect, useMemo, useState } from 'react'
import { Entity } from '@dcl/ecs'
import { Item } from 'react-contexify'
import { AiFillDelete as DeleteIcon, AiOutlinePlus as AddIcon, AiOutlineMinus as RemoveIcon } from 'react-icons/ai'
import { Action, Trigger, TriggerType } from '@dcl/asset-packs'

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

import { Props } from './types'

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

    const areValidActions = useCallback(
      (updatedTriggers: Trigger[]) =>
        updatedTriggers.length > 0 &&
        !updatedTriggers.some((action) => !action.type || !action?.entity || !action.action),
      []
    )

    useEffect(() => {
      if (areValidActions(triggers)) {
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

    const handleAddNewTrigger = useCallback(() => {
      setTriggers((prev: Trigger[]) => {
        return [...prev, { type: TriggerType.ON_CLICK }]
      })
    }, [setTriggers])

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
      ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>, idx: number) => {
        setTriggers((prev: Trigger[]) => {
          const data = [...prev]
          data[idx] = {
            ...data[idx],
            entity: entitiesWithAction?.find((entity) => entity.toString() === value)
          }
          return data
        })
      },
      [entitiesWithAction, setTriggers]
    )

    const handleChangeAction = useCallback(
      ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>, idx: number) => {
        setTriggers((prev: Trigger[]) => {
          const data = [...prev]
          data[idx] = {
            ...data[idx],
            action: value as TriggerType
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
        {triggers.map((trigger: Trigger, idx: number) => {
          return (
            <Block key={`trigger-${idx}`}>
              <Dropdown
                label={'Interaction'}
                options={Object.values(TriggerType).filter((v) => isNaN(Number(v))) as string[]}
                value={trigger.type}
                onChange={(e) => handleChangeType(e, idx)}
              />
              <Dropdown
                label={'Entity'}
                options={
                  availableActions
                    ? [
                        { value: '', text: 'Select an Entity' },
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
                        { value: '', text: 'Select an Action' },
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
