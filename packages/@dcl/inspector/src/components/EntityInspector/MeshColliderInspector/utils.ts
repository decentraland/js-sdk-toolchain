import { ColliderLayer, PBMeshCollider } from '@dcl/ecs'
import { MeshColliderInput } from './types'
import { MeshType } from '../MeshRendererInspector/types'

export const fromMeshCollider = (value: PBMeshCollider): MeshColliderInput => {
  const collisionMask = (value.collisionMask ?? ColliderLayer.CL_PHYSICS).toString()
  switch (value.mesh?.$case) {
    case 'sphere':
      return { collisionMask, mesh: MeshType.MT_SPHERE }
    case 'cylinder':
      return {
        collisionMask,
        mesh: MeshType.MT_CYLINDER,
        radiusTop: String(value.mesh.cylinder.radiusTop ?? 0.5),
        radiusBottom: String(value.mesh.cylinder.radiusBottom ?? 0.5)
      }
    case 'plane':
      return { collisionMask, mesh: MeshType.MT_PLANE }
    case 'box':
    default:
      return { collisionMask, mesh: MeshType.MT_BOX }
  }
}

export const toMeshCollider = (value: MeshColliderInput): PBMeshCollider => {
  const collisionMask = Number(value.collisionMask ?? ColliderLayer.CL_PHYSICS)
  switch (value.mesh) {
    case MeshType.MT_SPHERE:
      return { collisionMask, mesh: { $case: MeshType.MT_SPHERE, sphere: {} } }
    case MeshType.MT_CYLINDER:
      return {
        collisionMask,
        mesh: {
          $case: MeshType.MT_CYLINDER,
          cylinder: {
            radiusTop: Number(value.radiusTop ?? 0.5),
            radiusBottom: Number(value.radiusBottom ?? 0.5)
          }
        }
      }
    case MeshType.MT_PLANE:
      return { collisionMask, mesh: { $case: MeshType.MT_PLANE, plane: {} } }
    case MeshType.MT_BOX:
    default:
      return { collisionMask, mesh: { $case: MeshType.MT_BOX, box: {} } }
  }
}

export function isValidInput(): boolean {
  return true
}
