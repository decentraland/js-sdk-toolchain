import { Entity, IEngine } from '@dcl/ecs'
import { isLastWriteWinComponent } from '../../../hooks/sdk/useComponentValue'
import { ComponentName, getNextId } from '@dcl/asset-packs'

export const COMPONENTS_WITH_ID: string[] = [ComponentName.ACTIONS, ComponentName.STATES, ComponentName.COUNTER]

export function addComponent(engine: IEngine) {
  return function addComponent(entity: Entity, componentId: number) {
    const component = engine.getComponent(componentId)
    if (isLastWriteWinComponent<{ id?: number }>(component)) {
      component.create(entity)
      if (COMPONENTS_WITH_ID.includes(component.componentName)) {
        const value = component.getMutable(entity)
        value.id = getNextId(engine as any)
      }
    } else {
      throw new Error('Cannot add component: it must be an LWW component')
    }
  }
}

export default addComponent
