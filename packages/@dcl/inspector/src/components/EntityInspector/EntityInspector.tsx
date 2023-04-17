import { useSelectedEntity } from '../../hooks/sdk/useSelectedEntity'
import { ROOT } from '../../lib/sdk/tree'

import { GltfInspector } from './GltfInspector'
import { SceneInspector } from './SceneInspector'
import { TransformInspector } from './TransformInspector'

export const EntityInspector: React.FC = () => {
  const entity = useSelectedEntity()

  return (
    <div className="EntityInspector" key={entity}>
      {entity && <TransformInspector entity={entity} />}
      {entity && <GltfInspector entity={entity} />}
      <SceneInspector entity={ROOT} />
    </div>
  )
}
