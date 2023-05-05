import { Entity, IEngine } from '@dcl/ecs'
import { useState } from 'react'
import { Component } from '../../lib/sdk/components'
import { SdkContextValue } from '../../lib/sdk/context'
import { useChange } from './useChange'
import { useSdk } from './useSdk'

function getEntities(engine: IEngine, component: Component) {
  return Array.from(engine.getEntitiesWith(component), ([entity]) => entity)
}

export const useEntitiesWith = (getComponent: (components: SdkContextValue['components']) => Component) => {
  const [entities, setEntities] = useState<Entity[]>([])

  // set initial value
  useSdk(({ engine, components }) => {
    const component = getComponent(components)
    setEntities(getEntities(engine, component))
  })

  // listen to changes
  useChange((event, { engine, components }) => {
    const component = getComponent(components)

    if (event.component?.componentId === component.componentId) {
      setEntities(getEntities(engine, component))
    }
  })

  return entities
}
