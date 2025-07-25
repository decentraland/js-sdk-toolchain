import { ComponentName } from '@dcl/asset-packs'
import { Entity, LastWriteWinElementSetComponentDefinition, CrdtMessageType } from '@dcl/ecs'
import { useCallback, useMemo, useState } from 'react'

import { SdkContextValue } from '../../lib/sdk/context'
import { useSdk } from './useSdk'
import { useChange } from './useChange'
import { CoreComponents } from '../../lib/sdk/components'
import { getConfig } from '../../lib/logic/config'
import { CAMERA, EDITOR_ENTITIES, PLAYER, ROOT } from '../../lib/sdk/tree'

export const DISABLED_COMPONENTS: string[] = [
  CoreComponents.ANIMATOR,
  CoreComponents.AUDIO_STREAM,
  CoreComponents.NFT_SHAPE,
  CoreComponents.VIDEO_PLAYER,
  CoreComponents.NETWORK_ENTITY,
  CoreComponents.TWEEN_SEQUENCE,
  ComponentName.ADMIN_TOOLS,
  ComponentName.REWARDS,
  CoreComponents.AVATAR_ATTACH
]

export const SMART_ITEM_COMPONENTS: string[] = [
  ComponentName.STATES,
  ComponentName.ACTIONS,
  ComponentName.TRIGGERS,
  ComponentName.COUNTER,
  ComponentName.COUNTER_BAR
]

export const ROOT_COMPONENTS: Record<Entity, string[]> = {
  [ROOT]: [],
  [PLAYER]: [],
  [CAMERA]: []
}

export function isRoot(entity: Entity) {
  return EDITOR_ENTITIES.includes(entity)
}

export function getEnabledComponents(disabledComponents = DISABLED_COMPONENTS) {
  const components: Set<string> = new Set(Object.values(CoreComponents))
  const config = getConfig()

  if (!config.disableSmartItems) {
    for (const component of SMART_ITEM_COMPONENTS) {
      components.add(component)
    }
  }

  for (const component of disabledComponents) {
    components.delete(component)
  }

  return components
}

const transformComponentName = (value: string): string => {
  switch (value) {
    case CoreComponents.SYNC_COMPONENTS:
      return 'Multiplayer'
    case CoreComponents.GLTF_CONTAINER:
      return 'GLTF'
    default:
      return value
  }
}

export const getComponentName = (value: string) => (transformComponentName(value).match(/[^:]*$/) || [])[0] || '?'

export const useEntityComponent = () => {
  const sdk = useSdk()
  const [availableComponentsState, setAvailableComponentsState] = useState<Array<{
    id: number
    name: string
    isOnEntity: boolean
  }> | null>(null)

  useChange(({ component, operation }) => {
    if (!component) return

    const isComponentChange =
      operation === CrdtMessageType.PUT_COMPONENT || operation === CrdtMessageType.DELETE_COMPONENT

    if (isComponentChange) {
      setAvailableComponentsState(null)
    }
  })

  const getComponents = useCallback(
    (entity: Entity, missing?: boolean): Map<number, string> => {
      const components = new Map<number, string>()
      if (sdk) {
        for (const component of sdk.engine.componentsIter()) {
          if (missing ? !component.has(entity) : component.has(entity)) {
            components.set(component.componentId, component.componentName)
          }
        }
      }

      return components
    },
    [sdk]
  )

  const addComponent = useCallback(
    (entity: Entity, componentId: number, value?: any) => {
      if (!sdk || sdk.engine.getComponentOrNull(componentId)?.has(entity)) return
      sdk.operations.addComponent(entity, componentId, value)
      sdk.operations.updateSelectedEntity(entity)
      void sdk.operations.dispatch()
    },
    [sdk]
  )

  const removeComponent = useCallback(
    (entity: Entity, component: LastWriteWinElementSetComponentDefinition<SdkContextValue['components']>) => {
      if (!sdk) return
      sdk.operations.removeComponent(entity, component)
      sdk.operations.updateSelectedEntity(entity)
      void sdk.operations.dispatch()
    },
    [sdk]
  )

  const enabledComponents = useMemo(() => {
    const components: Set<string> = new Set(Object.values(CoreComponents))
    const config = getConfig()

    if (!config.disableSmartItems) {
      for (const component of SMART_ITEM_COMPONENTS) {
        components.add(component)
      }
    }

    for (const component of DISABLED_COMPONENTS) {
      components.delete(component)
    }

    return components
  }, [])

  const getAvailableComponents = useCallback(
    (entity: Entity) => {
      if (availableComponentsState === null) {
        const allSystemComponents = new Map<number, string>()
        if (sdk) {
          for (const component of sdk.engine.componentsIter()) {
            allSystemComponents.set(component.componentId, component.componentName)
          }
        }

        let available = Array.from(allSystemComponents.entries())
          .filter(([_, name]) => enabledComponents.has(name))
          .map(([id, name]) => {
            const component = sdk?.engine.getComponentOrNull(id)
            const isOnEntity = component ? component.has(entity) : false

            return {
              id,
              name: getComponentName(name),
              isOnEntity
            }
          })
          .sort((a, b) => a.name.localeCompare(b.name))

        if (isRoot(entity)) {
          available = available.filter(
            (component) =>
              Array.isArray(ROOT_COMPONENTS[entity]) &&
              ROOT_COMPONENTS[entity].map((name) => getComponentName(name)).includes(component.name)
          )
        }

        setAvailableComponentsState(available)
        return available
      }

      return availableComponentsState
    },
    [getComponents, enabledComponents, availableComponentsState, sdk]
  )

  return { getComponents, addComponent, removeComponent, getAvailableComponents }
}
