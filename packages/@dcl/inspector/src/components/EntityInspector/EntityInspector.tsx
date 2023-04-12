import { useMemo } from 'react'

import { useEntitiesWith } from '../../hooks/sdk/useEntitiesWith'
import { TransformInspector } from './TransformInspector'
import { SceneInspector } from './SceneInspector'
import { ROOT } from '../../lib/sdk/tree'

export const EntityInspector: React.FC = () => {
  const selectedEntities = useEntitiesWith((components) => components.EntitySelected)
  const entity = useMemo(() => (selectedEntities.length > 0 ? selectedEntities[0] : null), [selectedEntities])

  if (!entity) return null

  return (
    <div className="EntityInspector" key={entity}>
      <TransformInspector entity={entity} />
      <SceneInspector entity={ROOT} />
    </div>
  )
}
