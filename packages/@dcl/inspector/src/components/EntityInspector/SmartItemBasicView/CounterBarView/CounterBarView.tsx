import React, { useCallback, useEffect, useMemo } from 'react'
import { Entity } from '@dcl/ecs'
import { Action, ActionType, getJson } from '@dcl/asset-packs'
import { withSdk, WithSdkProps } from '../../../../hoc/withSdk'
import { useComponentInput } from '../../../../hooks/sdk/useComponentInput'
import { useHasComponent } from '../../../../hooks/sdk/useHasComponent'
import { useArrayState } from '../../../../hooks/useArrayState'
import { useComponentValue } from '../../../../hooks/sdk/useComponentValue'
import { ConfigComponent, EditorComponentsTypes } from '../../../../lib/sdk/components'
import { Block } from '../../../Block'
import { TextField, ColorField } from '../../../ui'
import { fromCounterBar, isValidInput as isValidCounterBarInput, toCounterBar } from '../../CounterBarInspector/utils'
import { fromCounter, isValidInput as isValidCounterInput, toCounter } from '../../CounterInspector/utils'

export default React.memo(
  withSdk<WithSdkProps & { entity: Entity; field: ConfigComponent['fields'][0] }>(({ sdk, entity, field }) => {
    const { Counter, CounterBar, Actions } = sdk.components
    const { getInputProps: getCounterInputProps } = useComponentInput(
      entity,
      Counter,
      fromCounter,
      toCounter,
      isValidCounterInput
    )
    const { getInputProps: getCounterBarInputProps } = useComponentInput(
      entity,
      CounterBar,
      fromCounterBar,
      toCounterBar,
      isValidCounterBarInput
    )
    const [actionComponent, setActionComponentValue, isActionComponentEqual] = useComponentValue<
      EditorComponentsTypes['Actions']
    >(entity, Actions)
    const [actions, _, modifyAction] = useArrayState<Action>(actionComponent === null ? [] : actionComponent.value)

    const availableHealthBarActions: Map<string, [number, Action]> = useMemo(() => {
      return actions.reduce((mappedActions, action, actionIdx) => {
        if (action.type === 'set_counter') {
          if (action.name === 'Reset') {
            mappedActions.set('reset', [actionIdx, action])
          }
        }
        return mappedActions
      }, new Map<string, [number, Action]>())
    }, [actions])

    const hasCounter = useHasComponent(entity, Counter)
    const hasCounterBar = useHasComponent(entity, CounterBar)
    const hasResetCounterAction = availableHealthBarActions.size > 0

    const isCounterBarComponent = field.type === 'asset-packs::CounterBar'
    const isHealthBarComponent = hasCounter && hasCounterBar && hasResetCounterAction

    useEffect(() => {
      const current = Actions.get(entity)
      if (!isActionComponentEqual({ ...current, value: actions })) {
        setActionComponentValue({ ...current, value: [...actions] })
      }
    }, [entity, actions, isActionComponentEqual])

    const handleUpdateHealthResetAction = useCallback(
      (value: number) => {
        if (!!availableHealthBarActions.get('reset')) {
          const [resetActionIdx, resetAction] = availableHealthBarActions.get('reset') as [number, Action]
          modifyAction(resetActionIdx, {
            ...resetAction,
            jsonPayload: getJson<ActionType.SET_COUNTER>({ counter: value })
          })
        }
      },
      [availableHealthBarActions, modifyAction]
    )

    const handleUpdateHealthBarValues = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const { onChange: onChangeCounter } = getCounterInputProps('value')
        const { onChange: onChangeCounterBar } = getCounterBarInputProps('maxValue')

        onChangeCounter!(event)
        onChangeCounterBar!(event)
        handleUpdateHealthResetAction(Number(event.target.value))
      },
      [getCounterInputProps, getCounterBarInputProps, handleUpdateHealthResetAction]
    )

    return (
      <>
        <Block>
          <TextField
            label={field.name}
            type="number"
            {...(isCounterBarComponent ? getCounterBarInputProps('maxValue') : getCounterInputProps('value'))}
            {...(isHealthBarComponent ? { onChange: handleUpdateHealthBarValues } : {})}
          />
        </Block>
        {isCounterBarComponent && (
          <>
            <Block>
              <ColorField label="Primary Color" {...getCounterBarInputProps('primaryColor')} />
            </Block>
            <Block>
              <ColorField label="Secondary Color" {...getCounterBarInputProps('secondaryColor')} />
            </Block>
          </>
        )}
      </>
    )
  })
)
