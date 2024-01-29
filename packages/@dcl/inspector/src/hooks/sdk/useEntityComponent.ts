import { Entity, LastWriteWinElementSetComponentDefinition } from '@dcl/ecs'
import { useCallback } from 'react'

import { SdkContextValue } from '../../lib/sdk/context'
import { useSdk } from './useSdk'

export const useEntityComponent = () => {
  const sdk = useSdk()

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

  return { getComponents, addComponent, removeComponent }
}
