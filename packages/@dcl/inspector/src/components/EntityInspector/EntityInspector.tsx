import { Entity } from '@dcl/ecs'

import { useSelectedEntity } from '../../hooks/sdk/useSelectedEntity'
import { withSdk } from '../../hoc/withSdk'

import { SceneInspector } from './SceneInspector'
import { TransformInspector } from './TransformInspector'
import { GltfInspector } from './GltfInspector'
import './EntityInspector.css'

export const EntityInspector = withSdk(({ sdk }) => {
  const entity = useSelectedEntity()

  if (entity !== null) {
    const nameComponent = sdk.components.Name.getOrNull(entity)
    const label = entity === 0 as Entity ? 'Scene' : (nameComponent ? nameComponent.value : entity.toString())

    const inspectors = [SceneInspector, TransformInspector, GltfInspector]

    return (
      <div className="EntityInspector" key={entity}>
        <div className="entity-label">{label}</div>
        {inspectors.map((Inspector, index) => entity !== null && <Inspector key={index} entity={entity} />)}
      </div>
    )
  } else {
    return <div className="EntityInspector"></div>
  }
})

export default EntityInspector
