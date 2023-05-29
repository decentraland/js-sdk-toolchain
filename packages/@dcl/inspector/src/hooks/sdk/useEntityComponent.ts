import { Entity } from '@dcl/ecs'
import { useCallback } from 'react'

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
    (entity: Entity, componentId: number) => {
      if (!sdk) return
      sdk.operations.addComponent(entity, componentId)
      sdk.operations.dispatch()
    },
    [sdk]
  )

  return { getComponents, addComponent }
}
