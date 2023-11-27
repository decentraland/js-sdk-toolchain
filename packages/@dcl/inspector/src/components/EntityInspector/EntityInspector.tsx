import { useEffect, useMemo, useState } from 'react'

import { Entity } from '@dcl/ecs'

import { useSelectedEntity } from '../../hooks/sdk/useSelectedEntity'
import { withSdk } from '../../hoc/withSdk'
import { SdkContextEvents, SdkContextValue } from '../../lib/sdk/context'
import { useChange } from '../../hooks/sdk/useChange'
import { useAppSelector } from '../../redux/hooks'
import { getHiddenComponents } from '../../redux/ui'

import { GltfInspector } from './GltfInspector'
import { ActionInspector } from './ActionInspector'
import { TriggerInspector } from './TriggerInspector'
import { MaterialInspector } from './MaterialInspector'
import { MeshColliderInspector } from './MeshColliderInspector'
import { MeshRendererInspector } from './MeshRendererInspector'
import { SceneInspector } from './SceneInspector'
import { TextShapeInspector } from './TextShapeInspector'
import { TransformInspector } from './TransformInspector'
import { StatesInspector } from './StatesInspector'
import { CounterInspector } from './CounterInspector'
import { AudioSourceInspector } from './AudioSourceInspector'
import { VisibilityComponentInspector } from './VisibilityComponentInspector'
import { VideoPlayerInspector } from './VideoPlayerInspector'
import { AudioStreamInspector } from './AudioStreamInspector'
import { NftShapeInspector } from './NftShapeInspector'
import { AnimatorInspector } from './AnimatorInspector'
import { PointerEventsInspector } from './PointerEventsInspector'

import './EntityInspector.css'

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

  const inspectors = useMemo(
    () => [
      { name: sdk.components.GltfContainer.componentName, component: GltfInspector },
      { name: sdk.components.VisibilityComponent.componentName, component: VisibilityComponentInspector },
      { name: sdk.components.Material.componentName, component: MaterialInspector },
      { name: sdk.components.MeshCollider.componentName, component: MeshColliderInspector },
      { name: sdk.components.MeshRenderer.componentName, component: MeshRendererInspector },
      { name: sdk.components.Scene.componentName, component: SceneInspector },
      { name: sdk.components.TextShape.componentName, component: TextShapeInspector },
      { name: sdk.components.Transform.componentName, component: TransformInspector },
      { name: sdk.components.Actions.componentName, component: ActionInspector },
      { name: sdk.components.Triggers.componentName, component: TriggerInspector },
      { name: sdk.components.States.componentName, component: StatesInspector },
      { name: sdk.components.Counter.componentName, component: CounterInspector },
      { name: sdk.components.AudioSource.componentName, component: AudioSourceInspector },
      { name: sdk.components.VideoPlayer.componentName, component: VideoPlayerInspector },
      { name: sdk.components.AudioStream.componentName, component: AudioStreamInspector },
      { name: sdk.components.NftShape.componentName, component: NftShapeInspector },
      { name: sdk.components.Animator.componentName, component: AnimatorInspector },
      { name: sdk.components.PointerEvents.componentName, component: PointerEventsInspector }
    ],
    [sdk]
  )

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
