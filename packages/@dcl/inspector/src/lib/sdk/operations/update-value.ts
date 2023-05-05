import { Entity, IEngine, LastWriteWinElementSetComponentDefinition } from '@dcl/ecs'

export function updateValue(_engine: IEngine) {
  return function updateValue<T = unknown>(
    entity: Entity,
    component: LastWriteWinElementSetComponentDefinition<T>,
    data: Partial<T>
  ) {
    const value = component.getOrCreateMutable(entity)
    for (const key in data) {
      ;(value as any)[key] = data[key]
    }
  }
}

export default updateValue
