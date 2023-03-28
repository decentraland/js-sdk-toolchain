import { useEffect, useState } from 'react'
import isEqual from 'deep-equal'
import { CrdtMessageType, Entity, LastWriteWinElementSetComponentDefinition } from '@dcl/ecs'
import { Component } from '../../lib/sdk/components'
import { useChange } from './useChange'

function isLastWriteWinComponent<T = unknown>(
  component: Component
): component is LastWriteWinElementSetComponentDefinition<T> {
  return !!(component as LastWriteWinElementSetComponentDefinition<unknown>).createOrReplace
}

export const useComponentValue = <ComponentValueType>(entity: Entity, component: Component<ComponentValueType>) => {
  const [value, setValue] = useState<ComponentValueType>(component.get(entity) as ComponentValueType)

  // sync state -> engine
  useEffect(() => {
    const stateInEngine = component.get(entity)
    if (isEqual(value, stateInEngine)) {
      return
    }
    if (isLastWriteWinComponent(component)) {
      component.createOrReplace(entity, value)
    } else {
      // TODO: handle update for GrowOnlyValueSetComponentDefinition
      debugger
    }
  }, [value])

  // sync engine -> state
  useChange((event) => {
    if (entity === event.entity && component.componentId === event.component?.componentId && !!event.value) {
      if (event.operation === CrdtMessageType.PUT_COMPONENT) {
        setValue(event.value)
      } else {
        // TODO: handle update for GrowOnlyValueSetComponentDefinition
        debugger
      }
    }
  })

  return [value, setValue] as const
}
