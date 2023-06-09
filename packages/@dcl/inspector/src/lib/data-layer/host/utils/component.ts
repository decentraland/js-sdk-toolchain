import { ComponentDefinition, CompositeDefinition, DeepReadonlyObject, Entity } from '@dcl/ecs'
import { ReadWriteByteBuffer } from '@dcl/ecs/dist/serialization/ByteBuffer'
import { dataCompare } from '@dcl/ecs/dist/systems/crdt/utils'

import { EditorComponentsTypes } from '../../../sdk/components'
import { Scene } from '@dcl/schemas'

export function isEqual(component: ComponentDefinition<unknown>, prevValue: unknown, newValue: unknown) {
  if (prevValue === newValue || (!prevValue && !newValue)) return true
  if ((!prevValue && newValue) || (prevValue && !newValue)) return false
  const prevBuffer = new ReadWriteByteBuffer()
  const newBuffer = new ReadWriteByteBuffer()
  component.schema.serialize(prevValue as DeepReadonlyObject<unknown>, prevBuffer)
  component.schema.serialize(newValue as DeepReadonlyObject<unknown>, newBuffer)
  return dataCompare(prevBuffer.toBinary(), newBuffer.toBinary()) === 0
}

export function findPrevValue(composite: CompositeDefinition, componentName: string, entity: Entity) {
  const component = composite.components.find((c) => c.name === componentName)
  const value = component?.data.get(entity)
  if (value?.data?.$case !== 'json') {
    return null
  }
  return value.data.json
}

export function parseSceneFromComponent(value: DeepReadonlyObject<EditorComponentsTypes['Scene']>): Partial<Scene> {
  return {
    scene: {
      parcels: value.layout.parcels.map(($) => `${$.x},${$.y}`),
      base: `${value.layout.base.x},${value.layout.base.y}`
    }
  }
}
