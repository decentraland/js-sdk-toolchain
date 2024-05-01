import { useState } from 'react'
import { useEntityComponent } from './useEntityComponent'
import { Entity } from '@dcl/ecs'
import { isSmartByComponents } from '../../lib/logic/catalog'
import { useChange } from './useChange'

export const useSmart = (entity: Entity) => {
  const { getComponents } = useEntityComponent()
  const [isSmart, setIsSmart] = useState<boolean>()

  useChange(({ entity: _entity }) => {
    console.log('useChange', entity, _entity)
    if (entity === _entity) {
      const components = Array.from(getComponents(entity).values())
      console.log('components', components)
      const result = isSmartByComponents(components)
      console.log('result', result)
      setIsSmart(result)
    }
  }, [])

  return { isSmart }
}
