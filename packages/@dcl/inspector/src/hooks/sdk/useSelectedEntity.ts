import { useMemo } from 'react'
import { useEntitiesWith } from './useEntitiesWith'

export const useSelectedEntity = () => {
  const selectedEntities = useEntitiesWith((components) => components.Selection)
  const entity = useMemo(() => (selectedEntities.length > 0 ? selectedEntities[0] : null), [selectedEntities])
  return entity
}
