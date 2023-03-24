import { useEffect, useState } from 'react'
import { CrdtMessageType, Entity, LastWriteWinElementSetComponentDefinition } from '@dcl/ecs'
import isEqual from 'deep-equal'
import { useChange } from './useChange'

export type Component<T = unknown> = LastWriteWinElementSetComponentDefinition<T>

function isLastWriteWinComponent<T = unknown>(
  component: Component
): component is LastWriteWinElementSetComponentDefinition<T> {
  return !!(component as LastWriteWinElementSetComponentDefinition<unknown>).createOrReplace
}

export function useComponentValue<T>(entity: Entity, component: Component<T>) {
  const [value, setValue] = useState<T>(component.get(entity) as T)

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
