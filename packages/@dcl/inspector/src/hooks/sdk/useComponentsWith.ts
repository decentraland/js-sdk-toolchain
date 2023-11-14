import { Entity, IEngine } from '@dcl/ecs'
import { useCallback, useMemo } from 'react'
import { Component } from '../../lib/sdk/components'
import { SdkContextValue } from '../../lib/sdk/context'
import { useSdk } from './useSdk'

function getEntities(engine: IEngine, component: Component) {
  return Array.from(engine.getEntitiesWith(component), ([entity, value]) => ({ entity, value }))
}

export const useComponentsWith = (getComponent: (components: SdkContextValue['components']) => Component) => {
  const sdk = useSdk()

  const entities: { entity: Entity; value: Record<string, any> }[] = useMemo(() => {
    if (sdk) {
      const { engine, components } = sdk
      const component = getComponent(components)
      return getEntities(engine, component)
    }
    return []
  }, [sdk])

  const getEntityByComponentId = useCallback(
    (componentValue: any) => {
      return entities.find(({ value }) => value.id === componentValue.id)?.entity
    },
    [entities]
  )

  const getComponentValueByEntity = useCallback(
    (componentEntity: Entity) => {
      return entities.find(({ entity }) => entity === componentEntity)?.value
    },
    [entities]
  )

  return [entities, getEntityByComponentId, getComponentValueByEntity] as const
}
