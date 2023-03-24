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

export function useComponent<T>(entity: Entity, component: Component<T>) {
  const [state, setState] = useState<T>(component.get(entity) as T)

  // sync state -> engine
  useEffect(() => {
    const stateInEngine = component.get(entity)
    if (isEqual(state, stateInEngine)) {
      return
    }
    if (isLastWriteWinComponent(component)) {
      component.createOrReplace(entity, state)
    } else {
      // TODO: handle update for GrowOnlyValueSetComponentDefinition
      debugger
    }
  }, [state])

  // sync engine -> state
  useChange((event) => {
    if (
      entity === event.entity &&
      component.componentId === event.component?.componentId &&
      event.operation === CrdtMessageType.PUT_COMPONENT &&
      !!event.value
    ) {
      setState(event.value)
    }
  })

  return [state, setState] as const
}
