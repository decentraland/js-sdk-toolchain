import { ComponentDefinition, Entity, IEngine } from '@dcl/ecs'
import { ComponentName } from '@dcl/asset-packs'

import { CoreComponents } from '../../../lib/sdk/components'
import { getComponentName, getEnabledComponents } from '../../../hooks/sdk/useEntityComponent'

const DISABLED_COMPONENTS: string[] = [
  ComponentName.ACTIONS,
  ComponentName.TRIGGERS,
  CoreComponents.NETWORK_ENTITY,
  CoreComponents.SYNC_COMPONENTS
]

export type Component = {
  id: number
  name: string
  displayName: string
  potential?: boolean
}

export const ENABLED_COMPONENTS: Set<string> = getEnabledComponents(DISABLED_COMPONENTS)
export const POTENTIAL_COMPONENTS: string[] = [
  CoreComponents.ANIMATOR,
  CoreComponents.AUDIO_SOURCE,
  CoreComponents.AUDIO_STREAM,
  ComponentName.STATES,
  CoreComponents.TWEEN,
  CoreComponents.VIDEO_PLAYER,
  CoreComponents.VISIBILITY_COMPONENT
]

export function getComponents(entity: Entity, engine: IEngine): Component[][] {
  const Action = engine.getComponent(ComponentName.ACTIONS)
  const entityComponents: Component[] = []
  const availableComponents: Component[] = []
  const hasAction = Action.has(entity)

  for (const component of engine.componentsIter()) {
    if (!ENABLED_COMPONENTS.has(component.componentName)) continue
    const data = {
      id: component.componentId,
      name: component.componentName,
      displayName: getComponentName(component.componentName)
    }
    if (component.has(entity)) {
      entityComponents.push(data)
    } else if (hasAction && POTENTIAL_COMPONENTS.includes(component.componentName)) {
      entityComponents.push({ ...data, potential: true })
    } else {
      availableComponents.push(data)
    }
  }

  return [
    entityComponents.sort((a, b) => a.displayName.localeCompare(b.displayName)),
    availableComponents.sort((a, b) => a.displayName.localeCompare(b.displayName))
  ]
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

export function deleteComponentIds(
  engine: IEngine,
  entity: Entity,
  ids: number[],
  component: ComponentDefinition<any>
): number[] {
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

export function getThroughActionName(name: string): string {
  switch (name) {
    case CoreComponents.ANIMATOR:
      return '([Play Emote] Action)'
    case CoreComponents.AUDIO_SOURCE:
      return '([Play/Stop Sound] Action)'
    case CoreComponents.AUDIO_STREAM:
      return '([Play/Stop Audio Stream] Action)'
    case CoreComponents.TWEEN:
      return '([Start Tween] Action)'
    case ComponentName.STATES:
      return '([Set State] Action)'
    case CoreComponents.VIDEO_PLAYER:
      return '([Play/Stop Video Stream] Action)'
    case CoreComponents.VISIBILITY_COMPONENT:
      return '([Set Visibility] Action)'
    default:
      return '(through Action)'
  }
}
