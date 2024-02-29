import { Entity } from '@dcl/ecs'
import { useState } from 'react'

import { Component } from '../../lib/sdk/components'
import { useChange } from './useChange'

export const useHasComponent = (entity: Entity, component: Component) => {
  const [hasComponent, setHasComponent] = useState<boolean>(component.has(entity))

  useChange((event) => {
    if (event.component?.componentId === component.componentId && event.entity === entity) {
      setHasComponent(component.has(entity))
    }
  })

  return hasComponent
}
