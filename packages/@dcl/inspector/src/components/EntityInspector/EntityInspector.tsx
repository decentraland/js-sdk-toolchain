import { useSelectedEntity } from '../../hooks/sdk/useSelectedEntity'

import { SceneInspector } from './SceneInspector'
import { TransformInspector } from './TransformInspector'
import { GltfInspector } from './GltfInspector'
import './EntityInspector.css'

export const EntityInspector: React.FC = () => {
  const entity = useSelectedEntity()

  const inspectors = [SceneInspector, TransformInspector, GltfInspector]

  return (
    <div className="EntityInspector" key={entity}>
      {inspectors.map((Inspector, index) => entity !== null && <Inspector key={index} entity={entity} />)}
    </div>
  )
}
