import { ComponentDefinition, Entity } from '../../../packages/@dcl/ecs/src'

export function testComponentSerialization<T>(component: ComponentDefinition<T>, value: T) {
  {
    const entityA = 123 as Entity
    component.createOrReplace(entityA, value)
    const buffer = component.toBinary(entityA)
    expect(component.deserialize(buffer)).toBeDeepCloseTo(component.getMutable(entityA) as any)
  }
  {
    const entityA = 124 as Entity
    try {
      component.create(entityA)
      const buffer = component.toBinary(entityA)
      expect(component.deserialize(buffer)).toBeDeepCloseTo(component.getMutable(entityA) as any)
    } finally {
      component.deleteFrom(entityA)
    }
  }
}
