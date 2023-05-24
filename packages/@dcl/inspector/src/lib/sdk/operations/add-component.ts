import { Entity, IEngine } from '@dcl/ecs'
import { isLastWriteWinComponent } from '../../../hooks/sdk/useComponentValue'

export function addComponent(engine: IEngine) {
  return function addComponent(entity: Entity, componentId: number) {
    const component = engine.getComponent(componentId)
    if (isLastWriteWinComponent(component)) {
      component.create(entity)
    } else {
      throw new Error('Cannot add component: it must be an LWW component')
    }
  }
}

export default addComponent
