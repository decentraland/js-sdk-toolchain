import {
  LastWriteWinElementSetComponentDefinition,
  Entity,
  ISchema,
  DeepReadonly
} from '../../../packages/@dcl/ecs/src'
import { ReadWriteByteBuffer } from '../../../packages/@dcl/ecs/src/serialization/ByteBuffer'

export function testSerializationIdentity<T>(component: LastWriteWinElementSetComponentDefinition<T>, entity: Entity) {
  testSchemaSerializationIdentity(component.schema, component.get(entity))
}

export function testSchemaSerializationIdentity<T>(schema: ISchema<T>, value: DeepReadonly<T>) {
  const buffer = new ReadWriteByteBuffer()
  schema.serialize(value, buffer)
  expect(schema.deserialize(buffer)).toBeDeepCloseTo(value as any)
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
