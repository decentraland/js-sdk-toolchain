import { AbstractMesh, Color3, Vector3 } from '@babylonjs/core'
import { ComponentType } from '@dcl/ecs'
import { CoreComponents } from '../../../sdk/components'
import { EcsEntity } from '../EcsEntity'
import type { ComponentOperation } from '../component-operations'

let addedCameraObservable = false
const highlightedMeshes = new Set<AbstractMesh>()

export function toggleSelection(mesh: AbstractMesh, value: boolean) {
  mesh.renderOutline = value
  mesh.outlineColor = Color3.White()
  mesh.renderOverlay = value
  mesh.overlayColor = Color3.White()
  mesh.overlayAlpha = 0.1
  if (value) {
    highlightedMeshes.add(mesh)
  } else {
    highlightedMeshes.delete(mesh)
  }
}

export const putEntitySelectedComponent: ComponentOperation = (entity, component) => {
  if (component.componentType === ComponentType.LastWriteWinElementSet) {
    const componentValue = component.getOrNull(entity.entityId) as { gizmo: number } | null
    const scene = entity.context.deref()!.scene

    if (!addedCameraObservable && scene.activeCamera) {
      scene.activeCamera.onViewMatrixChangedObservable.add(() => {
        if (!scene.activeCamera) return
        for (const mesh of highlightedMeshes) {
          const distance = Vector3.Distance(scene.activeCamera.position, mesh.position)
          mesh.outlineWidth = distance / 700
        }
      })
      addedCameraObservable = true
    }

    if (entity.meshRenderer) {
      toggleSelection(entity.meshRenderer, !!componentValue)
    }

    if (entity.gltfContainer) {
      for (const mesh of entity.gltfContainer.getChildMeshes()) {
        if (mesh.name.includes('collider')) continue
        toggleSelection(mesh, !!componentValue)
      }
    }

    updateGizmoManager(entity, componentValue)
  }
}

export const updateGizmoManager = (entity: EcsEntity, value: { gizmo: number } | null) => {
  const context = entity.context.deref()!
  let processedSomeEntity = false

  const Transform = context.engine.getComponent(CoreComponents.TRANSFORM)

  for (const [_entity] of context.engine.getEntitiesWith(context.editorComponents.Selection)) {
    processedSomeEntity = true
    if (entity.entityId === _entity && Transform.has(_entity)) {
      context.gizmos.setEntity(entity)
      const types = context.gizmos.getGizmoTypes()
      const type = types[value?.gizmo || 0]
      context.gizmos.setGizmoType(type)
      return
    }
  }

  if (!processedSomeEntity) {
    context.gizmos.unsetEntity()
  }
}
