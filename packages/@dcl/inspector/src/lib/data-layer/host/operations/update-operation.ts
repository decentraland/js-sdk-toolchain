import { DeepReadonly, Entity, LastWriteWinElementSetComponentDefinition } from '@dcl/ecs'
import { DataLayerContext, DispatchOperation, UpdateValue } from '../../remote-data-layer'
import { ReadWriteByteBuffer } from '@dcl/ecs/dist/serialization/ByteBuffer'

export async function updateValue(operation: UpdateValue, { engine }: Omit<DataLayerContext, 'fs'>) {
  const { entityId, componentId, data } = operation
  const buffer = new ReadWriteByteBuffer(data)
  const component = engine.getComponent(componentId) as LastWriteWinElementSetComponentDefinition<unknown>
  const value = component.schema.deserialize(buffer)
  component.createOrReplace(entityId as Entity, value)
  await engine.update(1 / 16)
}

export function updateValueOperation<T = unknown>(entityId: Entity, component: LastWriteWinElementSetComponentDefinition<T>, value: T): DispatchOperation {
  const componentId = component.componentId
  const buffer = new ReadWriteByteBuffer()
  component.schema.serialize(value as DeepReadonly<T>, buffer)

  const data = buffer.toBinary()
  return { operation: { $case: 'updateValue', updateValue: { entityId: entityId as number, componentId, data } } }
}

export default updateValue