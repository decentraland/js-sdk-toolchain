import { MeshBuilder, VertexBuffer } from '@babylonjs/core'
import { ComponentType, PBMeshRenderer } from '@dcl/ecs'
import { memoize } from '../../../logic/once'
import type { ComponentOperation } from '../component-operations'
import { EcsEntity } from '../EcsEntity'
import * as BABYLON from '@babylonjs/core'

export const putMeshRendererComponent: ComponentOperation = (entity, component) => {
  if (component.componentType === ComponentType.LastWriteWinElementSet) {
    const newValue = component.getOrNull(entity.entityId) as PBMeshRenderer | null
    entity.ecsComponentValues.meshRenderer = newValue || undefined

    // for simplicity of the example, we will remove the Mesh on every update.
    // this is not optimal for production code, re-using when possible is RECOMMENDED
    removeMeshRenderer(entity)

    let mesh: BABYLON.Mesh | undefined = undefined

    // then proceed to create the desired MeshRenderer
    if (newValue?.mesh?.$case === 'box') {
      mesh = MeshBuilder.CreateBox(entity.entityId.toString(), { updatable: false }, entity.getScene())
      setMeshUvs(mesh, newValue.mesh.box.uvs)
    } else if (newValue?.mesh?.$case === 'sphere') {
      mesh = MeshBuilder.CreateSphere(entity.entityId.toString(), { diameter: 1, updatable: false, segments: 8 }, entity.getScene())
    } else if (newValue?.mesh?.$case === 'cylinder') {
      mesh = MeshBuilder.CreateCylinder('cone', {
        diameterTop: newValue.mesh.cylinder.radiusTop !== undefined ? newValue.mesh.cylinder.radiusTop * 2 : 1,
        diameterBottom: newValue.mesh.cylinder.radiusBottom !== undefined ? newValue.mesh.cylinder.radiusBottom * 2 : 1,
        enclose: true,
        subdivisions: 16,
        tessellation: 16,
        arc: Math.PI * 2,
        updatable: false,
        height: 1
      })
    } else if (newValue?.mesh?.$case === 'plane') {
      mesh = MeshBuilder.CreatePlane('plane-shape', {
        width: 1,
        height: 1,
        sideOrientation: 2,
        updatable: true
      })

      setMeshUvs(mesh, newValue.mesh.plane.uvs)
    }

    if (mesh) {
      entity.meshRenderer = mesh
      entity.meshRenderer.parent = entity
    }

    // make the renderer interactable only if the entity is Pickable
    if (entity.meshRenderer) {
      entity.meshRenderer.isPickable = true
      entity.meshRenderer.showBoundingBox =
        entity.context.deref()?.editorComponents.Selection.has(entity.entityId) || false
    }
  }
}

function removeMeshRenderer(entity: EcsEntity) {
  if (entity.meshRenderer) {
    entity.meshRenderer.setEnabled(false)
    entity.meshRenderer.parent = null
    entity.meshRenderer.dispose(false, false)
    delete entity.meshRenderer
  }
}

function setMeshUvs(mesh: BABYLON.Mesh, uvs: number[] = []) {
  if (!uvs.length) {
    mesh.updateVerticesData(VertexBuffer.UVKind, [0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0])
  } else {
    mesh.updateVerticesData(VertexBuffer.UVKind, uvs)
  }
}
