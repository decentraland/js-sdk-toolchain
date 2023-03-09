import { engine } from '@dcl/ecs'

export function getComponentFromNameOrNull(name: string) {
  for (const component of engine.componentsIter()) {
    if (component.componentName === name) {
      return component
    }
  }
  return null
}
