import { useEffect, useState } from 'react'
import {
  CrdtMessageType,
  DeepReadonly,
  DeepReadonlySet,
  Entity,
  LastWriteWinElementSetComponentDefinition
} from '@dcl/ecs'
import { Component } from '../../lib/sdk/components'
import { useChange } from './useChange'
import { ReadWriteByteBuffer } from '@dcl/ecs/dist/serialization/ByteBuffer'
import { dataCompare } from '@dcl/ecs/dist/systems/crdt/utils'

export function isLastWriteWinComponent<T = unknown>(
  component: Component
): component is LastWriteWinElementSetComponentDefinition<T> {
  return !!(component as LastWriteWinElementSetComponentDefinition<unknown>).createOrReplace
}

const getComponentValue = <T>(entity: Entity, component: Component<T>): DeepReadonlySet<T> =>
  (isLastWriteWinComponent(component)
    ? component.getOrNull(entity) || component.schema.create()
    : component.get(entity)) as DeepReadonlySet<T>

export const useComponentValue = <ComponentValueType>(entity: Entity, component: Component<unknown>) => {
  const componentValueType = getComponentValue(entity, component)
  const [value, setValue] = useState<ComponentValueType>(componentValueType as ComponentValueType)

  function isEqual(val: ComponentValueType) {
    const current = new ReadWriteByteBuffer()
    const newValue = new ReadWriteByteBuffer()
    component.schema.serialize(val as DeepReadonly<ComponentValueType>, newValue)
    component.schema.serialize(getComponentValue(entity, component), current)
    return dataCompare(current.toBinary(), newValue.toBinary()) === 0
  }

  // sync entity changed
  useEffect(() => {
    setValue(getComponentValue(entity, component) as ComponentValueType)
  }, [entity])

  // sync state -> engine
  useEffect(() => {
    if (value === null) return
    if (isEqual(value)) {
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
  useChange(
    (event) => {
      if (entity === event.entity && component.componentId === event.component?.componentId && !!event.value) {
        if (event.operation === CrdtMessageType.PUT_COMPONENT) {
          // TODO: This setValue is generating a isEqual comparission.
          // Maybe we have to use two two pure functions instead of an effect.
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

  return [value, setValue, isEqual] as const
}
