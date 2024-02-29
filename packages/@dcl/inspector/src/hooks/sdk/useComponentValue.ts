import { useEffect, useState } from 'react'
import { CrdtMessageType, DeepReadonly, Entity, LastWriteWinElementSetComponentDefinition } from '@dcl/ecs'
import { recursiveCheck } from 'jest-matcher-deep-close-to/lib/recursiveCheck'

import { Component } from '../../lib/sdk/components'
import { useChange } from './useChange'
import { useSdk } from './useSdk'

export function isLastWriteWinComponent<T = unknown>(
  component: Component
): component is LastWriteWinElementSetComponentDefinition<T> {
  return !!(component as LastWriteWinElementSetComponentDefinition<unknown>).createOrReplace
}

export const getComponentValue = <T>(entity: Entity, component: Component<T>): DeepReadonly<T> =>
  (isLastWriteWinComponent(component)
    ? component.getOrNull(entity) || component.schema.create()
    : component.get(entity)) as DeepReadonly<T>

export const useComponentValue = <ComponentValueType>(entity: Entity, component: Component<ComponentValueType>) => {
  const componentValueType = getComponentValue(entity, component)
  const [value, setValue] = useState<ComponentValueType>(componentValueType as ComponentValueType)
  const sdk = useSdk()
  // sync entity changed
  useEffect(() => {
    setValue(getComponentValue(entity, component) as ComponentValueType)
  }, [entity])

  // sync state -> engine
  useEffect(() => {
    if (value === null) return
    const isEqualValue = !recursiveCheck(getComponentValue(entity, component), value, 2)

    if (isEqualValue) {
      return
    }
    if (isLastWriteWinComponent(component) && sdk) {
      sdk.operations.updateValue(component, entity, value!)
      void sdk.operations.dispatch()
    } else {
      // TODO: handle update for GrowOnlyValueSetComponentDefinition
      debugger
    }
  }, [value])

  // sync engine -> state
  useChange(
    (event) => {
      if (entity === event.entity && component.componentId === event.component?.componentId && !!event.value) {
        if (event.operation === CrdtMessageType.PUT_COMPONENT) {
          // TODO: This setValue is generating a isEqual comparission.
          // Maybe we have to use two pure functions instead of an effect.
          // Same happens with the input & componentValue.
          setValue(event.value)
        } else {
          // TODO: handle update for GrowOnlyValueSetComponentDefinition
          debugger
        }
      }
    },
    [entity, component]
  )

  function isComponentEqual(val: ComponentValueType) {
    return !recursiveCheck(getComponentValue(entity, component), val, 2)
  }

  return [value, setValue, isComponentEqual] as const
}
