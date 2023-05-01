import { Entity, IEngine, LastWriteWinElementSetComponentDefinition } from "@dcl/ecs"

export function updateValue(engine: IEngine) {
  return function <T = unknown>(entity: Entity, component: LastWriteWinElementSetComponentDefinition<T>, data: Partial<T>, updateEngine = false) {
    const value = component.getOrCreateMutable(entity)
    for (const key in data) {
      ;(value as any)[key] = data[key]
    }
    if (updateEngine) return engine.update(1)
  }
}

export default updateValue