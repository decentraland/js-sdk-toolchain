import { useSelectedEntity } from '../../hooks/sdk/useSelectedEntity'
import { ROOT } from '../../lib/sdk/tree'
import { TransformInspector } from './TransformInspector'
import { SceneInspector } from './SceneInspector'

export const EntityInspector: React.FC = () => {
  const entity = useSelectedEntity()
  if (!entity) return null

  return (
    <div className="EntityInspector" key={entity}>
      <TransformInspector entity={entity} />
      <SceneInspector entity={ROOT} />
    </div>
  )
}
