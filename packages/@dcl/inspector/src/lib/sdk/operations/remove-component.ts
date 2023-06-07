import { Entity, IEngine, LastWriteWinElementSetComponentDefinition } from '@dcl/ecs'

export function removeComponent(_engine: IEngine) {
  return function removeComponent<T>(entity: Entity, component: LastWriteWinElementSetComponentDefinition<T>) {
    component.deleteFrom(entity)
  }
}

export default removeComponent
