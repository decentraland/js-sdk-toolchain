import { AbstractMesh, Color3 } from '@babylonjs/core'
import { ComponentType } from '@dcl/ecs'
import { CoreComponents } from '../../../sdk/components'
import { EcsEntity } from '../EcsEntity'
import type { ComponentOperation } from '../component-operations'

const highlightedMeshes = new Set<AbstractMesh>()

export const putEntitySelectedComponent: ComponentOperation = (entity, component) => {
  if (component.componentType === ComponentType.LastWriteWinElementSet) {
    const componentValue = entity.isLocked() ? null : (component.getOrNull(entity.entityId) as { gizmo: number } | null)
    toggleSelection(entity, !!componentValue)
    updateGizmoManager(entity, componentValue)
  }
}

export function toggleMeshSelection(mesh: AbstractMesh, value: boolean) {
  mesh.renderOverlay = value
  mesh.overlayColor = Color3.White()
  mesh.overlayAlpha = 0.2
  if (value) {
    highlightedMeshes.add(mesh)
  } else {
    highlightedMeshes.delete(mesh)
  }
}

export const toggleSelection = (entity: EcsEntity, value: boolean) => {
  if (entity.meshRenderer) {
    toggleMeshSelection(entity.meshRenderer, value)
  }

  if (entity.gltfContainer) {
    for (const mesh of entity.gltfContainer.getChildMeshes()) {
      if (mesh.name.includes('collider')) continue
      toggleMeshSelection(mesh, value)
    }
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
