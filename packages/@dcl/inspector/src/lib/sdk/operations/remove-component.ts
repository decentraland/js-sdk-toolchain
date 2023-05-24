import { Entity, IEngine } from '@dcl/ecs'
import { isLastWriteWinComponent } from '../../../hooks/sdk/useComponentValue'

export function removeComponent(engine: IEngine) {
  return function removeComponent(entity: Entity, componentId: number) {
    const component = engine.getComponent(componentId)
    if (isLastWriteWinComponent(component)) {
      component.deleteFrom(entity)
    } else {
      throw new Error('Cannot add component: it must be an LWW component')
    }
  }
}

export default removeComponent
