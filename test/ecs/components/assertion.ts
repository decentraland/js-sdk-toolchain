import { ComponentDefinition, Entity } from '../../../packages/@dcl/ecs/src'

export function testComponentSerialization<T>(component: ComponentDefinition<T>, value: T) {
  const entity = 123 as Entity
  component.createOrReplace(entity, value)
  const buffer = component.toBinary(entity)
  expect(component.deserialize(buffer)).toBeDeepCloseTo(component.getMutable(entity) as any)
}
