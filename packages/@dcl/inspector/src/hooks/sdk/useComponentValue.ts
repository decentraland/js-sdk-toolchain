import { useEffect, useState } from 'react'
import { CrdtMessageType, DeepReadonly, Entity, LastWriteWinElementSetComponentDefinition } from '@dcl/ecs'
import { Component } from '../../lib/sdk/components'
import { useChange } from './useChange'
import { ReadWriteByteBuffer } from '@dcl/ecs/dist/serialization/ByteBuffer'
import { dataCompare } from '@dcl/ecs/dist/systems/crdt/utils'

function isLastWriteWinComponent<T = unknown>(
  component: Component
): component is LastWriteWinElementSetComponentDefinition<T> {
  return !!(component as LastWriteWinElementSetComponentDefinition<unknown>).createOrReplace
}

export const useComponentValue = <ComponentValueType>(entity: Entity, component: Component<ComponentValueType>) => {
  const [value, setValue] = useState<ComponentValueType>(component.get(entity) as ComponentValueType)

  function isEqual(val: ComponentValueType) {
    const buf = new ReadWriteByteBuffer()
    const buf2 = new ReadWriteByteBuffer()
    component.schema.serialize(val as DeepReadonly<ComponentValueType>, buf)
    component.schema.serialize(component.get(entity), buf2)
    return dataCompare(buf.toBinary(), buf2.toBinary()) === 0
  }

  // sync state -> engine
  useEffect(() => {
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
  useChange((event) => {
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
  })

  return [value, setValue, isEqual] as const
}
