import { AbstractMesh, Color3 } from '@babylonjs/core'
import { ComponentType } from '@dcl/ecs'
import { CoreComponents, EditorComponentsTypes } from '../../../sdk/components'
import { EcsEntity } from '../EcsEntity'
import type { ComponentOperation } from '../component-operations'

const highlightedMeshes = new Set<AbstractMesh>()

export const putEntitySelectedComponent: ComponentOperation = (entity, component) => {
  if (component.componentType === ComponentType.LastWriteWinElementSet) {
    if (entity.isLocked()) return deleteEntitySelectedComponent(entity, component)

    const componentValue = component.get(entity.entityId) as unknown as EditorComponentsTypes['Selection']
    setGizmoManager(entity, componentValue)
  }
}

export const deleteEntitySelectedComponent: ComponentOperation = (entity, component) => {
  if (component.componentType === ComponentType.LastWriteWinElementSet) {
    unsetGizmoManager(entity)
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

export const setGizmoManager = (entity: EcsEntity, value: { gizmo: number }) => {
  const context = entity.context.deref()!
  const Transform = context.engine.getComponent(CoreComponents.TRANSFORM)

  if (!Transform.has(entity.entityId)) return

  toggleSelection(entity, true)

  const selectedEntities = Array.from(context.engine.getEntitiesWith(context.editorComponents.Selection))
  const types = context.gizmos.getGizmoTypes()
  const type = types[value?.gizmo || 0]
  context.gizmos.setGizmoType(type)

  if (selectedEntities.length === 1) {
    context.gizmos.setEntity(entity)
  } else if (selectedEntities.length > 1) {
    context.gizmos.repositionGizmoOnCentroid()
  }
}

export const unsetGizmoManager = (entity: EcsEntity) => {
  const context = entity.context.deref()!
  const selectedEntities = Array.from(context.engine.getEntitiesWith(context.editorComponents.Selection))
  const currentEntity = context.gizmos.getEntity()

  toggleSelection(entity, false)

  if (currentEntity?.entityId === entity.entityId || selectedEntities.length === 0) {
    context.gizmos.unsetEntity()
  } else {
    context.gizmos.repositionGizmoOnCentroid()
  }
}
