import { ComponentDefinition, Entity, IEngine } from '@dcl/ecs'

import { getComponentName, getEnabledComponents } from '../../Hierarchy/ContextMenu/ContextMenu'
import { CoreComponents } from '../../../lib/sdk/components'
import { ComponentName } from '@dcl/asset-packs'

const DISABLED_COMPONENTS: string[] = [
  CoreComponents.TRANSFORM,
  CoreComponents.NETWORK_ENTITY,
  CoreComponents.SYNC_COMPONENTS,
  CoreComponents.TWEEN
]

export type Component = {
  id: number
  name: string
}

export const ENABLED_COMPONENTS = getEnabledComponents(DISABLED_COMPONENTS)
export const POTENTIAL_COMPONENTS = [CoreComponents.ANIMATOR, CoreComponents.AUDIO_SOURCE, CoreComponents.TWEEN]

export function getComponents(entity: Entity, engine: IEngine) {
  const entityComponents: Component[] = []
  const availableComponents: Component[] = []

  for (const component of engine.componentsIter()) {
    if (!ENABLED_COMPONENTS.has(component.componentName)) continue
    const data = { id: component.componentId, name: getComponentName(component.componentName) }
    if (component.has(entity)) {
      entityComponents.push(data)
    } else {
      availableComponents.push(data)
    }
  }

  return [
    entityComponents.sort((a, b) => a.name.localeCompare(b.name)),
    availableComponents.sort((a, b) => a.name.localeCompare(b.name))
  ]
}

export function getPotentialComponents(entity: Entity, engine: IEngine): Component[] {
  const Action = engine.getComponent(ComponentName.ACTIONS)
  if (!Action.has(entity)) return []

  return POTENTIAL_COMPONENTS.reduce((acc: Component[], $) => {
    const component = engine.getComponent($)
    if (component.has(entity)) return acc
    acc.push({ id: component.componentId, name: getComponentName(component.componentName) })
    return acc
  }, [])
}

export function putComponentIds(engine: IEngine, ids: number[], component: ComponentDefinition<any>): number[] {
  const componentIds = new Set(ids)

  switch (component.componentName) {
    case ComponentName.ACTIONS: {
      POTENTIAL_COMPONENTS.forEach(($) => {
        const component = engine.getComponent($)
        componentIds.add(component.componentId)
      })
      componentIds.add(component.componentId)
      break
    }
    default:
      componentIds.add(component.componentId)
    }

  return Array.from(componentIds)
}

export function deleteComponentIds(engine: IEngine, entity: Entity, ids: number[], component: ComponentDefinition<any>): number[] {
  const componentIds = new Set(ids)

  switch (component.componentName) {
    case ComponentName.ACTIONS: {
      POTENTIAL_COMPONENTS.forEach(($) => {
        const component = engine.getComponent($)
        if (!component.has(entity)) componentIds.delete(component.componentId)
      })
      componentIds.delete(component.componentId)
      break
    }
    default:
      componentIds.delete(component.componentId)
  }

  return Array.from(componentIds)
}
