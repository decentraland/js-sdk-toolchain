import { Entity, LastWriteWinElementSetComponentDefinition } from '@dcl/ecs'
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

export function updateValueOperation(entityId: number, componentId: number, value: Uint8Array): DispatchOperation {
  return { operation: { $case: 'updateValue', updateValue: { entityId, componentId, data: value } } }
}

export default updateValue