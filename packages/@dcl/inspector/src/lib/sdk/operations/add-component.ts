import { Entity, IEngine } from '@dcl/ecs'
import { isLastWriteWinComponent } from '../../../hooks/sdk/useComponentValue'

export function addComponent(engine: IEngine) {
  return function addComponent(entity: Entity, componentId: number) {
    const component = engine.getComponent(componentId)
    if (isLastWriteWinComponent(component)) {
      component.create(entity)
    }
  }
}

export default addComponent
