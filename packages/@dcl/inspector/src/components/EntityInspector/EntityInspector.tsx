import { Entity } from '@dcl/ecs'

import { useSelectedEntity } from '../../hooks/sdk/useSelectedEntity'
import { withSdk } from '../../hoc/withSdk'
import { SdkContextValue } from '../../lib/sdk/context'

import { SceneInspector } from './SceneInspector'
import { TransformInspector } from './TransformInspector'
import { GltfInspector } from './GltfInspector'
import './EntityInspector.css'

const getLabel = (sdk: SdkContextValue, entity: Entity) => {
  const nameComponent = sdk.components.Name.getOrNull(entity)
  return entity === 0 ? 'Scene' : (nameComponent ? nameComponent.value : entity.toString())
}

export const EntityInspector = withSdk(({ sdk }) => {
  const entity = useSelectedEntity()
  const inspectors = [SceneInspector, TransformInspector, GltfInspector]

  const label = entity !== null ? getLabel(sdk, entity) : null

  return (
    <div className="EntityInspector" key={entity}>
      <div className="entity-label">{label}</div>
      {inspectors.map((Inspector, index) => entity !== null && <Inspector key={index} entity={entity} />)}
    </div>
  )
})

export default EntityInspector
