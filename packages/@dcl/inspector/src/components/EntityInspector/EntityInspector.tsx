import { useEffect, useState } from 'react'

import { Entity } from '@dcl/ecs'

import { useSelectedEntity } from '../../hooks/sdk/useSelectedEntity'
import { withSdk } from '../../hoc/withSdk'
import { SdkContextEvents, SdkContextValue } from '../../lib/sdk/context'
import { useChange } from '../../hooks/sdk/useChange'

import { SceneInspector } from './SceneInspector'
import { TransformInspector } from './TransformInspector'
import { GltfInspector } from './GltfInspector'
import './EntityInspector.css'
import { EditorComponentNames } from '../../lib/sdk/components'
import { useAppSelector } from '../../redux/hooks'
import { getHiddenComponents } from '../../redux/ui'

const getLabel = (sdk: SdkContextValue, entity: Entity | null) => {
  if (entity === null) return null
  const nameComponent = sdk.components.Name.getOrNull(entity)
  return entity === 0
    ? 'Scene'
    : nameComponent && nameComponent.value.length > 0
    ? nameComponent.value
    : entity.toString()
}

export const EntityInspector = withSdk(({ sdk }) => {
  const entity = useSelectedEntity()
  const [label, setLabel] = useState<string | null>()
  const hiddenComponents = useAppSelector(getHiddenComponents)

  useEffect(() => {
    setLabel(getLabel(sdk, entity))
  }, [sdk, entity])

  const handleUpdate = (event: SdkContextEvents['change']) => {
    if (event.entity === entity && event.component === sdk.components.Name) {
      setLabel(getLabel(sdk, entity))
    }
  }
  useChange(handleUpdate, [entity])

  const inspectors = [
    { name: EditorComponentNames.Scene, component: SceneInspector },
    { name: 'core::Transform', component: TransformInspector },
    { name: 'core::GltfContainer', component: GltfInspector }
  ]

  return (
    <div className="EntityInspector" key={entity}>
      <div className="entity-label">{label}</div>
      {inspectors.map(
        ({ name, component: Inspector }, index) =>
          entity !== null && !hiddenComponents[name] && <Inspector key={index} entity={entity} />
      )}
    </div>
  )
})

export default EntityInspector
