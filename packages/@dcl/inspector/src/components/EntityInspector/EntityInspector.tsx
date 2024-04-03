import { useEffect, useMemo, useState } from 'react'

import { withSdk } from '../../hoc/withSdk'
import { useChange } from '../../hooks/sdk/useChange'
import { useSelectedEntity } from '../../hooks/sdk/useSelectedEntity'
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
import { SyncComponentsInspector } from './SyncComponentsInspector'
import { EntityHeader } from './EntityHeader'
import { CounterBarInspector } from './CounterBarInspector'
import { TweenInspector } from './TweenInspector'
import { SmartItemBasicView } from './SmartItemBasicView'

import './EntityInspector.css'

export const EntityInspector = withSdk(({ sdk }) => {
  const entity = useSelectedEntity()
  const hiddenComponents = useAppSelector(getHiddenComponents)
  const [isBasicViewEnabled, setIsBasicViewEnabled] = useState(false)

  useChange(
    (event) => {
      if (event.entity === entity && event.component?.componentId === sdk.components.Config.componentId) {
        setIsBasicViewEnabled(sdk.components.Config.getOrNull(entity)?.isBasicViewEnabled === true)
      }
    },
    [entity, sdk]
  )

  useEffect(() => {
    if (entity !== null) {
      setIsBasicViewEnabled(sdk.components.Config.getOrNull(entity)?.isBasicViewEnabled === true)
    }
  }, [entity, sdk, setIsBasicViewEnabled])

  const inspectors = useMemo(
    () => [{ name: sdk.components.Transform.componentName, component: TransformInspector }],
    [sdk]
  )

  const advancedInspectorComponents = useMemo(
    () => [
      { name: sdk.components.GltfContainer.componentName, component: GltfInspector },
      {
        name: sdk.components.VisibilityComponent.componentName,
        component: VisibilityComponentInspector
      },
      {
        name: sdk.components.Material.componentName,
        component: MaterialInspector
      },
      {
        name: sdk.components.MeshCollider.componentName,
        component: MeshColliderInspector
      },
      {
        name: sdk.components.MeshRenderer.componentName,
        component: MeshRendererInspector
      },
      { name: sdk.components.Scene.componentName, component: SceneInspector },
      {
        name: sdk.components.TextShape.componentName,
        component: TextShapeInspector
      },
      { name: sdk.components.Tween.componentName, component: TweenInspector },
      { name: sdk.components.Actions.componentName, component: ActionInspector },
      {
        name: sdk.components.Triggers.componentName,
        component: TriggerInspector
      },
      { name: sdk.components.States.componentName, component: StatesInspector },
      { name: sdk.components.Counter.componentName, component: CounterInspector },
      {
        name: sdk.components.AudioSource.componentName,
        component: AudioSourceInspector
      },
      {
        name: sdk.components.VideoPlayer.componentName,
        component: VideoPlayerInspector
      },
      {
        name: sdk.components.AudioStream.componentName,
        component: AudioStreamInspector
      },
      {
        name: sdk.components.NftShape.componentName,
        component: NftShapeInspector
      },
      {
        name: sdk.components.Animator.componentName,
        component: AnimatorInspector
      },
      {
        name: sdk.components.PointerEvents.componentName,
        component: PointerEventsInspector
      },
      {
        name: sdk.components.SyncComponents.componentName,
        component: SyncComponentsInspector
      },
      { name: sdk.components.CounterBar.componentName, component: CounterBarInspector }
    ],
    [sdk]
  )

  return (
    <div className="EntityInspector" key={entity}>
      {entity !== null ? (
        <>
          <EntityHeader entity={entity} />
          {inspectors.map(
            ({ name, component: Inspector }, index) =>
              !hiddenComponents[name] && <Inspector key={index} entity={entity} />
          )}
          {isBasicViewEnabled ? (
            <SmartItemBasicView entity={entity} />
          ) : (
            advancedInspectorComponents.map(
              ({ name, component: Inspector }, index) =>
                !hiddenComponents[name] && <Inspector key={index} entity={entity} />
            )
          )}
        </>
      ) : null}
    </div>
  )
})

export default EntityInspector
