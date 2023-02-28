import * as BABYLON from '@babylonjs/core'

import { Billboard, ComponentDefinition, GltfContainer, MeshRenderer, PointerEvents } from '@dcl/ecs'
import { Transform } from '@dcl/ecs'
import { EcsEntity } from './EcsEntity'
import { putTransformComponent } from './components/transform'
import { putMeshRendererComponent } from './components/mesh-renderer'
import { putPointerEventsComponent } from './components/pointer-events'
import { putBillboardComponent } from './components/billboard'
import { putGltfContaierComponent } from './components/gltf-container'

export type ComponentOperation = <T>(ecsEntity: EcsEntity, component: ComponentDefinition<T>) => void

export const componentPutOperations: Record<number, ComponentOperation> = {
  [Transform.componentId]: putTransformComponent,
  [MeshRenderer.componentId]: putMeshRendererComponent,
  [PointerEvents.componentId]: putPointerEventsComponent,
  [Billboard.componentId]: putBillboardComponent,
  [GltfContainer.componentId]: putGltfContaierComponent
}
