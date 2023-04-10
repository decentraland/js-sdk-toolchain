import { useCallback, useMemo } from 'react'
import { Entity } from '@dcl/ecs'

import { useEntitiesWith } from '../../hooks/sdk/useEntitiesWith'
import { TransformInspector } from './TransformInspector'
import { SceneInspector } from './SceneInspector'
import { ROOT } from '../../lib/sdk/tree'
import { useSdk } from '../../hooks/sdk/useSdk'
import { isLastWriteWinComponent } from '../../hooks/sdk/useComponentValue'

export const EntityInspector: React.FC = () => {
  const selectedEntities = useEntitiesWith((components) => components.EntitySelected)
  const sdk = useSdk()
  const entity = useMemo(() => (selectedEntities.length > 0 ? selectedEntities[0] : null), [selectedEntities])

  const handleRemove = (entity: Entity, componentId: number) => {
    if (sdk) {
      const component = sdk.engine.getComponent(componentId)
      if (isLastWriteWinComponent(component)) {
        component.deleteFrom(entity)
      }
    }
  }

  if (!entity) return null

  return (
    <div className="EntityInspector" key={entity}>
      <TransformInspector entity={entity} onRemove={handleRemove} />
      <SceneInspector entity={ROOT} />
    </div>
  )
}
