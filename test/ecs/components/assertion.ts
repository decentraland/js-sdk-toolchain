import { LastWriteWinElementSetComponentDefinition, Entity } from '../../../packages/@dcl/ecs/src'
import { ReadWriteByteBuffer } from '../../../packages/@dcl/ecs/src/serialization/ByteBuffer'

export function testSerializationIdentity<T>(component: LastWriteWinElementSetComponentDefinition<T>, entity: Entity) {
  const buffer = new ReadWriteByteBuffer()
  component.schema.serialize(component.get(entity), buffer)
  expect(component.schema.deserialize(buffer)).toBeDeepCloseTo(component.get(entity) as any)
}

export function testComponentSerialization<T>(component: LastWriteWinElementSetComponentDefinition<T>, value: T) {
  {
    const entityA = 123 as Entity
    component.createOrReplace(entityA, value)
    testSerializationIdentity(component, entityA)
  }
  {
    const entityA = 124 as Entity
    try {
      component.create(entityA)
      testSerializationIdentity(component, entityA)
    } finally {
      component.deleteFrom(entityA)
    }
  }
}
