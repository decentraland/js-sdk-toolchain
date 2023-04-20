import { Entity } from '@dcl/ecs'
import { useCallback } from 'react'

import { useSdk } from './useSdk'
import { isLastWriteWinComponent } from './useComponentValue'

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
      const component = sdk.engine.getComponent(componentId)
      if (isLastWriteWinComponent(component)) {
        component.create(entity)
      }
    },
    [sdk]
  )

  return { getComponents, addComponent }
}
